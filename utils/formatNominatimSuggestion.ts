import type { LocationSuggestion, OpenStreetMapResult } from '@julekgwa/react-native-places-autocomplete';

/** Nominatim `addressdetails=1` shape (subset). */
interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  path?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
  amenity?: string;
  shop?: string;
  [key: string]: string | undefined;
}

const US_STATE_ABBR: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
};

function regionAbbreviation(address: NominatimAddress): string | undefined {
  const iso = address['ISO3166-2-lvl4'];
  if (typeof iso === 'string' && iso.includes('-')) {
    return iso.split('-')[1];
  }
  const state = address.state;
  if (!state) return undefined;
  if (address.country_code === 'us' && US_STATE_ABBR[state]) {
    return US_STATE_ABBR[state];
  }
  return state;
}

function streetLine(address: NominatimAddress): string {
  const road = address.road ?? address.pedestrian ?? address.path ?? '';
  const parts = [address.house_number, road].filter(Boolean);
  return parts.join(' ');
}

function cityName(address: NominatimAddress): string {
  return (
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    ''
  );
}

/**
 * Two-line labels for Nominatim search results: a short title and a compact
 * location line (street / city / region / postcode), instead of the full
 * comma-separated `display_name`.
 */
export function formatSuggestionListLines(
  item: LocationSuggestion<OpenStreetMapResult>
): { primary: string; secondary: string } {
  const displayName = (item.display_name ?? '').trim();
  const raw = item.raw as Record<string, unknown> | undefined;
  const address = raw?.address as NominatimAddress | undefined;

  const firstSegment = displayName.split(',')[0]?.trim() ?? '';

  let primary = '';
  if (typeof raw?.name === 'string' && raw.name.trim()) {
    primary = raw.name.trim();
  } else if (address?.amenity?.trim()) {
    primary = address.amenity.trim();
  } else if (address?.shop?.trim()) {
    primary = address.shop.trim();
  } else {
    const st = address ? streetLine(address) : '';
    primary = st || firstSegment || displayName;
  }

  if (address) {
    const street = streetLine(address);
    const city = cityName(address);
    const neighbourhood =
      address.neighbourhood ?? address.suburb ?? address.quarter ?? '';
    const region = regionAbbreviation(address);
    const postcode = address.postcode ?? '';
    const country = address.country ?? '';
    const isUS = address.country_code === 'us';

    const primaryIsStreet =
      street.length > 0 && primary.toLowerCase() === street.toLowerCase();

    const secondaryParts: string[] = [];

    if (street && !primaryIsStreet) {
      secondaryParts.push(street);
    }

    let locality = '';
    if (city) {
      locality =
        neighbourhood && neighbourhood !== city
          ? `${neighbourhood}, ${city}`
          : city;
    } else if (neighbourhood) {
      locality = neighbourhood;
    }

    const regionZip = [region, postcode].filter(Boolean).join(' ');
    if (locality && regionZip) {
      secondaryParts.push(`${locality}, ${regionZip}`);
    } else if (locality) {
      secondaryParts.push(locality);
    } else if (regionZip) {
      secondaryParts.push(regionZip);
    }

    if (!isUS && country) {
      secondaryParts.push(country);
    }

    const secondary = secondaryParts.join(' · ');
    if (secondary) {
      return { primary, secondary };
    }
  }

  const segments = displayName.split(',').map((s) => s.trim()).filter(Boolean);
  if (segments.length <= 1) {
    return { primary: primary || displayName, secondary: '' };
  }

  const rest = segments.slice(1).join(', ');
  return { primary: primary || segments[0] || displayName, secondary: rest };
}
