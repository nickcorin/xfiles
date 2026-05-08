"""Location estimates for release records."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class LocationEstimate:
    """An approximate Earth coordinate for a source-record location."""

    latitude: float
    longitude: float


LOCATION_ESTIMATES = {
    "aegean sea": LocationEstimate(38.5, 25.0),
    "arabian gulf": LocationEstimate(26.5, 52.5),
    "arabian sea": LocationEstimate(15.0, 65.0),
    "azerbaijan": LocationEstimate(40.1431, 47.5769),
    "detroit, mi": LocationEstimate(42.3314, -83.0458),
    "eastern united states": LocationEstimate(38.0, -78.0),
    "georgia": LocationEstimate(42.3154, 43.3569),
    "germany": LocationEstimate(51.1657, 10.4515),
    "gulf of aden": LocationEstimate(12.5, 48.0),
    "gulf of oman": LocationEstimate(24.5, 58.5),
    "iran": LocationEstimate(32.4279, 53.688),
    "iraq": LocationEstimate(33.2232, 43.6793),
    "kazakhstan": LocationEstimate(48.0196, 66.9237),
    "mediterranean sea": LocationEstimate(34.5531, 18.048),
    "mexico": LocationEstimate(23.6345, -102.5528),
    "middle east": LocationEstimate(29.2985, 42.551),
    "netherlands": LocationEstimate(52.1326, 5.2913),
    "pacific ocean": LocationEstimate(0.0, -160.0),
    "pacific time zone": LocationEstimate(39.0, -120.0),
    "papua new guinea": LocationEstimate(-6.315, 143.9555),
    "persian gulf": LocationEstimate(26.5, 52.5),
    "strait of hormuz": LocationEstimate(26.5667, 56.25),
    "syria": LocationEstimate(35.0, 38.5),
    "turkmenistan": LocationEstimate(38.9697, 59.5563),
    "united states": LocationEstimate(39.8283, -98.5795),
    "western united states": LocationEstimate(39.1, -112.3),
}

NON_EARTH_LOCATIONS = {"", "low earth orbit", "moon", "n/a", "na"}


def estimate_location(location: str | None) -> LocationEstimate | None:
    """Return an Earth coordinate estimate for a source-record location."""
    if location is None:
        return None
    normalized = location.strip().lower()
    if normalized in NON_EARTH_LOCATIONS:
        return None
    return LOCATION_ESTIMATES.get(normalized)
