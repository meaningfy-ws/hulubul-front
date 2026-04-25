import type { Route, Transporter, TransportType, RouteSchedule } from "@/lib/routes-types";

export const transportTypeFixtures: TransportType[] = [
  { id: 1, documentId: "tt1", label: "Colete & pachete", slug: "colete-pachete", description: null },
  { id: 2, documentId: "tt2", label: "Transport persoane", slug: "transport-persoane", description: null },
];

export const transporterFixtures: Transporter[] = [
  {
    id: 1,
    documentId: "tr1",
    name: "Ion Transport SRL",
    type: "company",
    phoneNumbers: ["+352621123456"],
    transportTypes: [transportTypeFixtures[0]!],
    notes: null,
    status: "approved",
    submittedBy: null,
    claimedBy: null,
  },
  {
    id: 2,
    documentId: "tr2",
    name: "Maria Express",
    type: "individual",
    phoneNumbers: ["+37369999999"],
    transportTypes: [transportTypeFixtures[1]!],
    notes: null,
    status: "approved",
    submittedBy: null,
    claimedBy: null,
  },
];

export const scheduleFixtures: RouteSchedule[] = [
  {
    id: 10,
    documentId: "sch10",
    transporter: transporterFixtures[0]!,
    frequency: "weekly",
    departureDays: ["wed"],
    arrivalDays: ["thu"],
    notes: null,
    status: "approved",
  },
];

export const routeFixtures: Route[] = [
  {
    id: 1,
    documentId: "r1",
    name: "Luxembourg → Chișinău",
    citiesText: "Luxembourg, Metz, Lyon, Milano, Chișinău",
    geoJson: {
      type: "LineString",
      coordinates: [
        [6.1296, 49.6116],
        [6.1757, 49.1193],
        [4.8357, 45.764],
        [9.19, 45.4654],
        [28.8576, 47.0056],
      ],
    },
    status: "approved",
    submittedBy: "admin@hulubul.com",
    claimedBy: null,
    schedules: scheduleFixtures,
  },
  {
    id: 2,
    documentId: "r2",
    name: "Paris → București",
    citiesText: "Paris, Lyon, Geneva, Verona, București",
    geoJson: {
      type: "LineString",
      coordinates: [
        [2.3522, 48.8566],
        [4.8357, 45.764],
        [6.1432, 46.2044],
        [10.9916, 45.4384],
        [26.1025, 44.4268],
      ],
    },
    status: "approved",
    submittedBy: null,
    claimedBy: null,
    schedules: [],
  },
  {
    id: 3,
    documentId: "r3",
    name: "Frankfurt → Iași",
    citiesText: "Frankfurt, Innsbruck, Trieste, Iași",
    geoJson: null,
    status: "draft",
    submittedBy: null,
    claimedBy: null,
    schedules: [],
  },
];
