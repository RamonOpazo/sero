from src.service.ai_service import OllamaAiService, GenerateSelectionsRequest


class FakeClient:
    def __init__(self, payload: str, healthy: bool = True):
        self._payload = payload
        self._healthy = healthy
    async def health(self) -> bool:
        return self._healthy
    async def generate(self, model: str, prompt: str, options):
        return self._payload


def test_ai_health_ok_and_fail():
    svc_ok = OllamaAiService()
    svc_ok.client = FakeClient(payload="{}", healthy=True)
    import asyncio
    assert asyncio.get_event_loop().run_until_complete(svc_ok.health()) is True

    svc_fail = OllamaAiService()
    svc_fail.client = FakeClient(payload="{}", healthy=False)
    import asyncio
    assert asyncio.get_event_loop().run_until_complete(svc_fail.health()) is False


def test_generate_selections_parsing_and_clamping():
    raw = '{"selections": [ {"page_number": 0, "x": 1.5, "y": -0.2, "width": 0.4, "height": 0.3, "confidence": 0.9}, {"x": 0.2, "y": 0.2, "width": 0.2, "height": 0.2} ] }'
    svc = OllamaAiService()
    svc.client = FakeClient(payload=raw)
    req = GenerateSelectionsRequest(document_id="00000000-0000-4000-8000-0000000000ab")
    import asyncio
    res = asyncio.get_event_loop().run_until_complete(svc.generate_selections(req))
    # After merging, still 2 non-overlapping sets; one was clamped
    assert len(res.selections) == 2
    a, b = res.selections
    # clamped values; width is shrunk to fit within [0,1] since x==1.0
    assert a.x == 1.0 and a.y == 0.0
    assert a.width == 0.0 and a.height == 0.3
    assert a.confidence == 0.9
    # defaults applied
    assert b.page_number is None or isinstance(b.page_number, int)
    assert b.x == 0.2 and b.y == 0.2
    assert b.width == 0.2 and b.height == 0.2
    assert b.confidence is None


def test_generate_selections_handles_non_json_and_bad_items():
    svc = OllamaAiService()
    svc.client = FakeClient(payload="not json")
    import asyncio
    res = asyncio.get_event_loop().run_until_complete(svc.generate_selections(GenerateSelectionsRequest(document_id="00000000-0000-4000-8000-0000000000ab")))
    assert res.selections == []

    # list payload with bad item
    svc2 = OllamaAiService()
    svc2.client = FakeClient(payload='[{"x": "oops"}, {"x": 0.1, "y": 0.1, "width": 0.1, "height": 0.1}]')
    import asyncio
    res2 = asyncio.get_event_loop().run_until_complete(svc2.generate_selections(GenerateSelectionsRequest(document_id="00000000-0000-4000-8000-0000000000ab")))
    assert len(res2.selections) == 1


def test_generate_selections_merges_overlapping_and_sets_document_id():
    # Two overlapping rects should be merged into one
    raw = '{"selections": [ {"page_number": 0, "x": 0.1, "y": 0.1, "width": 0.2, "height": 0.2, "confidence": 0.5}, {"page_number": 0, "x": 0.25, "y": 0.15, "width": 0.2, "height": 0.2, "confidence": 0.9} ] }'
    svc = OllamaAiService()
    svc.client = FakeClient(payload=raw)
    doc_id = "00000000-0000-4000-8000-0000000000aa"
    req = GenerateSelectionsRequest(document_id=doc_id)
    import asyncio
    res = asyncio.get_event_loop().run_until_complete(svc.generate_selections(req))
    assert len(res.selections) == 1
    s = res.selections[0]
    # Merged union from (0.1,0.1)-(0.45,0.35)
    assert abs(s.x - 0.10) < 1e-9
    assert abs(s.y - 0.10) < 1e-9
    assert abs((s.x + s.width) - 0.45) < 1e-9
    assert abs((s.y + s.height) - 0.35) < 1e-9
    # Max confidence propagated
    assert s.confidence == 0.9
    # Document ID carried over from request
    assert str(s.document_id) == doc_id

