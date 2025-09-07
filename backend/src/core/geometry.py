from typing import Iterable
from pydantic import BaseModel, ConfigDict


# Alias for a normalized bounding box (x0, y0, x1, y1)
Box = tuple[float, float, float, float]


class NormRect(BaseModel):
    x: float
    y: float
    width: float
    height: float
    page_number: int | None = None
    confidence: float | None = None

    model_config = ConfigDict(frozen=True)

    def as_box(self) -> Box:
        return self.x, self.y, self.x + self.width, self.y + self.height


def clamp01(v: float) -> float:
    return 0.0 if v < 0.0 else 1.0 if v > 1.0 else v


def normalize_rect(x: float, y: float, width: float, height: float) -> Box:
    """Clamp rect to [0,1] and ensure x+width<=1, y+height<=1 by shrinking width/height if needed.

    Values are rounded to 10 decimal places to avoid floating point artifacts in tests and downstream logic.
    """
    x = clamp01(x)
    y = clamp01(y)
    width = max(0.0, min(1.0, width))
    height = max(0.0, min(1.0, height))
    if x + width > 1.0:
        width = max(0.0, 1.0 - x)
    if y + height > 1.0:
        height = max(0.0, 1.0 - y)
    # Round to mitigate floating point representation noise
    x = round(x, 10)
    y = round(y, 10)
    width = round(width, 10)
    height = round(height, 10)
    return x, y, width, height


def _overlap_or_touch(a: Box, b: Box, eps: float = 1e-9) -> bool:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    if ax1 < bx0 - eps:
        return False
    if bx1 < ax0 - eps:
        return False
    if ay1 < by0 - eps:
        return False
    if by1 < ay0 - eps:
        return False
    return True


def _union(a: Box, b: Box) -> Box:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    return min(ax0, bx0), min(ay0, by0), max(ax1, bx1), max(ay1, by1)


def _partition_by_page(rects: Iterable[NormRect]) -> dict[int | None, list[NormRect]]:
    groups: dict[int | None, list[NormRect]] = {}
    for r in rects:
        groups.setdefault(r.page_number, []).append(r)
    return groups


def _build_boxes_and_confs(items: list[NormRect]) -> tuple[list[Box], list[float | None]]:
    boxes: list[Box] = [i.as_box() for i in items]
    confs: list[float | None] = [i.confidence for i in items]
    return boxes, confs


def _find_targets(cur: Box, boxes: list[Box], used: list[bool]) -> list[int]:
    return [j for j, b in enumerate(boxes) if not used[j] and _overlap_or_touch(cur, b)]


def _union_many(cur: Box, boxes: list[Box], indices: list[int]) -> Box:
    x0, y0, x1, y1 = cur
    for j in indices:
        bx0, by0, bx1, by1 = boxes[j]
        x0 = min(x0, bx0)
        y0 = min(y0, by0)
        x1 = max(x1, bx1)
        y1 = max(y1, by1)
    return x0, y0, x1, y1


def _merge_conf(cur_conf: float | None, confs: list[float | None], indices: list[int]) -> float | None:
    vals = [confs[j] for j in indices if confs[j] is not None]
    if not vals:
        return cur_conf
    max_val = max(vals)  # type: ignore[arg-type]
    if cur_conf is None or (max_val is not None and max_val > cur_conf):  # type: ignore[operator]
        return float(max_val)
    return cur_conf


def _expand_cluster(seed_idx: int, boxes: list[Box], confs: list[float | None], used: list[bool]) -> tuple[Box, float | None]:
    cur = boxes[seed_idx]
    cur_conf = confs[seed_idx]
    used[seed_idx] = True
    while True:
        targets = _find_targets(cur, boxes, used)
        if not targets:
            break
        cur = _union_many(cur, boxes, targets)
        cur_conf = _merge_conf(cur_conf, confs, targets)
        for j in targets:
            used[j] = True
    return cur, cur_conf


def _merge_boxes_greedy(boxes: list[Box], confs: list[float | None]) -> tuple[list[Box], list[float | None]]:
    used = [False] * len(boxes)
    out_boxes: list[Box] = []
    out_confs: list[float | None] = []
    for i in range(len(boxes)):
        if used[i]:
            continue
        merged_box, merged_conf = _expand_cluster(i, boxes, confs, used)
        out_boxes.append(merged_box)
        out_confs.append(merged_conf)
    return out_boxes, out_confs


def _to_normrects(page: int | None, boxes: list[Box], confs: list[float | None]) -> list[NormRect]:
    out: list[NormRect] = []
    for (x0, y0, x1, y1), c in zip(boxes, confs):
        x, y, w, h = normalize_rect(x0, y0, x1 - x0, y1 - y0)
        out.append(NormRect(x=x, y=y, width=w, height=h, page_number=page, confidence=c))
    return out


def merge_rects(rects: Iterable[NormRect]) -> list[NormRect]:
    """Greedily merge overlapping/touching rects per page_number, with low nesting.

    - Coordinates are assumed normalized in [0,1].
    - Result rectangles are unions (bounding boxes) of merged clusters.
    - Confidence is the max of merged confidences (ignoring None).
    - page_number is preserved per group; None groups merge across all-pages scope.
    """
    merged_all: list[NormRect] = []
    for page, items in _partition_by_page(rects).items():
        boxes, confs = _build_boxes_and_confs(items)
        if not boxes:
            continue
        m_boxes, m_confs = _merge_boxes_greedy(boxes, confs)
        merged_all.extend(_to_normrects(page, m_boxes, m_confs))
    return merged_all

