import pytest

from backend.service.ai_service import OllamaAiService, GenerateSelectionsRequest


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
    req = GenerateSelectionsRequest(document_id="d")
    import asyncio
    res = asyncio.get_event_loop().run_until_complete(svc.generate_selections(req))
    assert len(res.selections) == 2
    a, b = res.selections
    # clamped values
    assert a.x == 1.0 and a.y == 0.0
    assert a.width == 0.4 and a.height == 0.3
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
    res = asyncio.get_event_loop().run_until_complete(svc.generate_selections(GenerateSelectionsRequest(document_id="d")))
    assert res.selections == []

    # list payload with bad item
    svc2 = OllamaAiService()
    svc2.client = FakeClient(payload='[{"x": "oops"}, {"x": 0.1, "y": 0.1, "width": 0.1, "height": 0.1}]')
    import asyncio
    res2 = asyncio.get_event_loop().run_until_complete(svc2.generate_selections(GenerateSelectionsRequest(document_id="d")))
    assert len(res2.selections) == 1

