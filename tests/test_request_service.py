from backend.services.request_service import RequestService


def test_expand_requested_car_types_handles_combined_labels():
    expanded = RequestService._expand_requested_car_types("suv/luxury")

    assert "suv" in expanded
    assert "luxury" in expanded
    assert "premium" in expanded
