from src.core.geometry import NormRect, merge_rects, normalize_rect, clamp01


def test_clamp01_basic():
    assert clamp01(-0.5) == 0.0
    assert clamp01(0.0) == 0.0
    assert clamp01(0.5) == 0.5
    assert clamp01(1.0) == 1.0
    assert clamp01(2.0) == 1.0


def test_normalize_rect_bounds_and_shrink():
    x, y, w, h = normalize_rect(-0.2, 1.1, 2.0, 0.6)
    # x,y clamped; width/height clamped then shrunk to fit in [0,1]
    assert x == 0.0 and y == 1.0
    assert w == 1.0 and h == 0.0  # fits exactly at y==1, so h shrinks to 0

    x2, y2, w2, h2 = normalize_rect(0.8, 0.8, 0.5, 0.5)
    assert (x2, y2) == (0.8, 0.8)
    assert w2 == 0.2 and h2 == 0.2


def test_merge_rects_overlap_same_page():
    rects = [
        NormRect(x=0.10, y=0.10, width=0.20, height=0.20, page_number=0, confidence=0.6),
        NormRect(x=0.25, y=0.15, width=0.20, height=0.20, page_number=0, confidence=0.9),
    ]
    merged = merge_rects(rects)
    assert len(merged) == 1
    r = merged[0]
    # Union should be from (0.10,0.10) to (0.45,0.35)
    assert abs(r.x - 0.10) < 1e-9
    assert abs(r.y - 0.10) < 1e-9
    assert abs((r.x + r.width) - 0.45) < 1e-9
    assert abs((r.y + r.height) - 0.35) < 1e-9
    assert r.page_number == 0
    assert r.confidence == 0.9  # max confidence


def test_merge_rects_disjoint_same_page():
    rects = [
        NormRect(x=0.10, y=0.10, width=0.10, height=0.10, page_number=1, confidence=None),
        NormRect(x=0.30, y=0.30, width=0.10, height=0.10, page_number=1, confidence=0.4),
    ]
    merged = merge_rects(rects)
    assert len(merged) == 2
    # Preserve individual rects
    xs = sorted((r.x, r.y, r.width, r.height, r.confidence) for r in merged)
    assert xs[0] == (0.10, 0.10, 0.10, 0.10, None)
    assert xs[1] == (0.30, 0.30, 0.10, 0.10, 0.4)


def test_merge_rects_respects_page_partition():
    rects = [
        NormRect(x=0.10, y=0.10, width=0.20, height=0.20, page_number=None, confidence=0.2),
        NormRect(x=0.15, y=0.15, width=0.10, height=0.10, page_number=0, confidence=0.5),
    ]
    merged = merge_rects(rects)
    # One for page None, one for page 0
    assert len(merged) == 2
    pages = sorted((r.page_number for r in merged), key=lambda v: -1 if v is None else v)
    assert pages == [None, 0]

