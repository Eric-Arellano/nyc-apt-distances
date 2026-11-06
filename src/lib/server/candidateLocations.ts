// Coordinates come from OpenStreetMap, so they only pick the closest candidate. Google routes to
// the `address`.
//
// The closest is by straight line, which highways and reservoirs can fool. The search area is
// within walking distance of the Hebrew Institute, inside White Plains, where streets follow the
// straight line closely enough. *Rejected: routing to every candidate, because each is billed.*

import type { Coordinates } from './closest';

interface Candidate extends Coordinates {
  name: string;
  address: string;
}

export type Candidates = readonly [Candidate, ...Candidate[]];

export const STATIONS: Candidates = [
  {
    name: 'White Plains',
    latitude: 41.033309,
    longitude: -73.775206,
    address: '16 Ferris Ave, White Plains, NY 10601',
  },
  {
    name: 'North White Plains',
    latitude: 41.051272,
    longitude: -73.772478,
    address: '1 Harlem Ave, White Plains, NY 10603',
  },
  {
    name: 'Hartsdale',
    latitude: 41.011048,
    longitude: -73.795569,
    address: '1 E Hartsdale Ave, Hartsdale, NY 10530',
  },
  {
    name: 'Scarsdale',
    latitude: 40.989847,
    longitude: -73.808414,
    address: '1 Depot Pl, Scarsdale, NY 10583',
  },
  {
    name: 'Harrison',
    latitude: 40.969598,
    longitude: -73.711817,
    address: '452 Halstead Ave, Harrison, NY 10528',
  },
];

// Large parks use their entrance, not their middle.
export const PARKS: Candidates = [
  {
    name: 'Bronx River Pathway (County Center)',
    latitude: 41.035662,
    longitude: -73.776418,
    address: '198 Central Ave, White Plains, NY 10606',
  },
  {
    name: 'Bronx River Pathway (North White Plains)',
    latitude: 41.050607,
    longitude: -73.773737,
    address: '1 Harlem Ave, White Plains, NY 10603',
  },
  {
    name: 'Kensico Dam Plaza',
    latitude: 41.072246,
    longitude: -73.766394,
    address: '1 Bronx River Pkwy, Valhalla, NY 10595',
  },
  {
    name: 'Cranberry Lake Preserve',
    latitude: 41.073566,
    longitude: -73.752113,
    address: '1609 Old Orchard St, North White Plains, NY 10604',
  },
  {
    name: 'Saxon Woods Park',
    latitude: 40.986562,
    longitude: -73.745018,
    address: '1800 Mamaroneck Ave, White Plains, NY 10605',
  },
  {
    name: 'Silver Lake Preserve',
    latitude: 41.038981,
    longitude: -73.753764,
    address: 'Silver Lake Preserve, Lake St, West Harrison, NY 10604',
  },
  {
    name: 'Delfino Park',
    latitude: 41.039678,
    longitude: -73.755126,
    address: '110 Lake St, White Plains, NY 10604',
  },
  {
    name: 'Gillie Park',
    latitude: 41.01269,
    longitude: -73.756186,
    address: '85 Gedney Way, White Plains, NY 10605',
  },
  {
    name: 'Gardella Park',
    latitude: 41.041724,
    longitude: -73.773537,
    address: '175 Ferris Ave, White Plains, NY',
  },
  {
    name: 'Turnure Park',
    latitude: 41.036289,
    longitude: -73.761745,
    address: '26 Lake St, White Plains, NY 10604',
  },
];

export const SUPERMARKETS: Candidates = [
  {
    name: 'ShopRite',
    latitude: 41.031941,
    longitude: -73.765737,
    address: '13 City Pl, White Plains, NY 10601',
  },
  {
    name: 'Stop & Shop',
    latitude: 41.0334,
    longitude: -73.756789,
    address: '154 Westchester Ave, White Plains, NY 10604',
  },
  {
    name: 'Whole Foods',
    latitude: 41.028238,
    longitude: -73.758606,
    address: '110 Bloomingdale Rd, White Plains, NY 10605',
  },
  {
    name: 'Wegmans',
    latitude: 41.020197,
    longitude: -73.717201,
    address: '106 Corporate Park Dr, West Harrison, NY 10604',
  },
  {
    name: 'ACME',
    latitude: 41.038728,
    longitude: -73.806996,
    address: '103 Knollwood Rd, White Plains, NY 10607',
  },
  {
    // Listed as C-Town before; recent listings call it The Food Emporium.
    name: 'S Lexington Ave supermarket',
    latitude: 41.027447,
    longitude: -73.771951,
    address: '134 S Lexington Ave, White Plains, NY 10606',
  },
  {
    name: "Trader Joe's",
    latitude: 41.025499,
    longitude: -73.793447,
    address: '215 N Central Ave, Hartsdale, NY 10530',
  },
];
