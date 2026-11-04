/**
 * Shapes published by the IEC results dashboard.
 *
 * The dashboard loads these objects from static JSON files under
 * `MapsJason/<year>/`. Fields are kept close to the source so the mapping
 * stays easy to audit. Optional fields are the ones that are not present at
 * every level of the feed (for example ward seats on a national result).
 */

export interface ProgressFields {
  ProvinceExpected: number;
  MunicExpected: number;
  WardExpected: number;
  VDExpected: number;
  SeatsExpected: number;
  ProvincesComplete: number;
  /** The IEC feed spells this field without the second "i". */
  MuncipalitiesComplete: number;
  WardsComplete: number;
  VDsComplete: number;
  SeatsComplete: number;
  Perc_ProvinceComplete: number;
  Perc_MunicipalityComplete: number;
  Perc_WardsComplete: number;
  Perc_VDsComplete: number;
  Perc_SeatsComplete: number;
  HungCouncils: number;
  DeadLockDrawnCouncils: number;
  MajorityCouncils: number;
  TotalDrawnCouncils: number;
  RegPop: number;
}

export interface PartyResult {
  ID: number;
  Name: string;
  TotalValidVotes?: number;
  PercOfVotes?: number;
  WardVotes?: number;
  WardSeatsWon?: number;
  PRVotes?: number;
  CouncilsWon?: number;
  MajorityWon?: number;
  PRSeatsWon?: number;
  TotalSeatsWon?: number;
  AvailableSeats?: number;
  IsCouncilWinner?: boolean;
  IsLeadingPartySeats?: boolean;
  IsLeadingPartyVotes?: boolean;
  IsLeadingParty?: boolean;
  IOrder?: number;
  RegisteredVoters?: number;
  TotalVotesCast?: number;
  ValidVotesCast?: number;
  SpoiltVotes?: number;
  SpecialVotes?: number;
  Year2000?: number;
  Year2006?: number;
  Year2011?: number;
  Year2016?: number;
  Year2021?: number;
  CandidateName?: string;
}

export interface VotingDistrictResult {
  VotingDistrictID: number;
  ReportDate?: string;
  PartyBallotResults: PartyResult[];
}

export interface WardResult extends ProgressFields {
  WardID: number;
  ReportDate?: string;
  VotingDistrictResults: VotingDistrictResult[];
  PartyBallotResults: PartyResult[];
}

export interface MunicipalityResult extends ProgressFields {
  ElectoralEventID?: number;
  ProvinceID: number;
  MunicipalityID: number;
  Province: string;
  Municipality: string;
  ReportDate?: string;
  WardResults: WardResult[];
  PartyBallotResults: PartyResult[];
}

export interface ProvinceResult extends ProgressFields {
  ElectoralEventID?: number;
  ProvinceID: number;
  Province: string;
  ReportDate?: string;
  MunicipalityResults: MunicipalityResult[];
  PartyBallotResults: PartyResult[];
}

export interface NationalResult extends ProgressFields {
  ElectoralEventID: number;
  ProvinceID: number;
  ReportDate?: string;
  ProvinceResults: ProvinceResult[];
  PartyBallotResults: PartyResult[];
}

export interface PartyInfo {
  ID: number;
  Name: string;
  PartyFullName: string;
  sWebColour: string;
  sLeaderBoardColour?: string;
  PartyImage: string;
  sPartyFilterText?: string;
}

export interface PartyMeta {
  id: string;
  abbr: string;
  name: string;
  color: string;
  image: string | null;
}

export interface HistoryRow {
  lEEId?: number;
  lYear: number;
  lPartyId: number;
  sPartyAbbr?: string;
  iPercentageSupport: number;
  lProvinceId?: number;
  lMunicipalityId?: number;
  Wards?: unknown;
}

export interface HistoryData {
  National: HistoryRow[];
  Provinces: HistoryRow[];
  Municipalities: HistoryRow[];
}

export type CouncilStatusKey = 'controlled' | 'hung' | 'drawn' | 'counting';

export interface CouncilStatus {
  key: CouncilStatusKey;
  label: string;
  seatsAllocated: number;
  seatsAvailable: number;
  leadingSeats: number;
}

export interface HistoryPoint {
  year: number;
  value: number;
}
