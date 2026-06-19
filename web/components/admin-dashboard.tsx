"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, type ChangeEvent, useEffect, useRef, useState } from "react";
import { getApiBaseUrl, getShareBaseUrl } from "../lib/runtime-urls";

const apiBaseUrl = getApiBaseUrl();
const shareBaseUrl = getShareBaseUrl();
const adminTokenStorageKey = "findmyshot_admin_token";
const adminEventPreferencesStorageKey = "findmyshot_admin_event_preferences";
const adminSelectedEventStorageKey = "findmyshot_admin_selected_event";
const adminSelectedEventQueryKey = "event";
const adminTemplateHistoryQueryKey = "template";
const adminTemplateCompareQueryKey = "compare";
const adminTemplatePairQueryKey = "pair";
const adminFilterQueryKeys = ["status", "date", "quick", "q", "sort", "event"] as const;
const adminSavedViewsStorageKeyPrefix = "findmyshot_admin_saved_views";
const adminSharedSavedViewFavoritesStorageKeyPrefix = "findmyshot_admin_shared_saved_view_favorites";
const adminSharedSavedViewUsageStorageKeyPrefix = "findmyshot_admin_shared_saved_view_usage";

type AssignedPhotographerItem = {
  id: string;
  name: string;
  email: string;
  password?: string | null;
};

type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

type LogoPlacement = {
  x: number;
  y: number;
  size: number;
};

type EventMaterials = {
  covers: string[];
  selected_cover: string | null;
  frame_horizontal: string | null;
  frame_vertical: string | null;
  frame_color?: string | null;
  frame_thickness?: number;
  logo_asset: string | null;
  qr_logo: string | null;
  logo_placement: LogoPlacement;
  distribution_mode?: "free" | "paid";
  sales_pricing?: {
    currency?: string | null;
    single_price?: number | null;
    pack_5_price?: number | null;
    pack_10_price?: number | null;
    pack_20_price?: number | null;
    pricing_note?: string | null;
  } | null;
};

type EventPhotographerRow = {
  id: number | string;
  name: string;
  email: string;
  password: string;
  saved: boolean;
};

const FRAME_STYLE_SWATCHES = [
  { value: "#ffffff", label: "Beyaz" },
  { value: "#f4efe3", label: "Krem" },
  { value: "#dfe8fb", label: "Buz Mavi" },
  { value: "#f0ece6", label: "Tas" },
  { value: "#111827", label: "Siyah" }
] as const;

type EventItem = {
  id: string;
  owner_id: string | null;
  title: string;
  slug: string;
  event_date: string | null;
  event_time?: string | null;
  location: string | null;
  status: string;
  qr_code_url: string | null;
  materials?: EventMaterials | null;
  photo_count?: number;
  assigned_photographers?: AssignedPhotographerItem[];
};

type DashboardSummary = {
  total_events: number;
  total_photos: number;
  total_faces: number;
  cover_ready_events: number;
  media_ready_events: number;
  upcoming_events: number;
  past_events: number;
  draft_events: number;
  photographer_count: number;
};

type PhotoItem = {
  id: string;
  event_id: string;
  file_name: string;
  uploaded_by: {
    id: string | null;
    full_name: string | null;
    email: string | null;
  } | null;
  original_url: string;
  preview_url: string;
  thumbnail_url: string;
  processing_status: string;
  faces_detected: number;
};

type UploadQueueItem = {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  errorMessage?: string;
};

const EVENT_STATUS_OPTIONS = [
  { value: "draft", label: "Taslak" },
  { value: "published", label: "Yayinda" },
  { value: "completed", label: "Tamamlandi" }
] as const;

type EventStatusValue = (typeof EVENT_STATUS_OPTIONS)[number]["value"];
type EventFilterValue = EventStatusValue | "all";
type EventDateFilterValue = "all" | "upcoming" | "past" | "undated";
type EventQuickFilterValue = "all" | "media_ready" | "cover_ready";
type EventSortValue = "recent" | "event_date_asc" | "event_date_desc" | "title_asc";
type TemplateStatusValue = "draft" | "published";
type AdminSidebarPanel = "event" | "list" | "views" | "shared";
type AdminMainPanel = "studio" | "settings";
type PhotoGalleryFilter = "all" | "with_faces" | "processing" | "ready";
type AdminEventDetailTab =
  | "general"
  | "photographers"
  | "photos"
  | "materials";
type EventViewPresetId =
  | "all_events"
  | "draft_review"
  | "live_launches"
  | "archive_media"
  | "cover_ready";
type SavedViewTemplate = {
  id: string;
  label: string;
  category: string;
  description: string;
  changeNote: string;
  targetRole: "admin" | "photographer" | "all";
  status: TemplateStatusValue;
  version: number;
  order: number;
  filters: {
    status: EventFilterValue;
    date: EventDateFilterValue;
    quick: EventQuickFilterValue;
    searchQuery: string;
    sort: EventSortValue;
  };
};
type SavedViewTemplateHistoryItem = {
  id: string;
  templateId: string;
  label: string;
  category: string | null;
  description: string | null;
  changeNote: string | null;
  targetRole: "admin" | "photographer" | "all";
  status: TemplateStatusValue;
  version: number;
  createdAt: string;
  filters: {
    status: EventFilterValue;
    date: EventDateFilterValue;
    quick: EventQuickFilterValue;
    searchQuery: string;
    sort: EventSortValue;
  };
};

type TemplateComparisonRow = {
  label: string;
  currentValue: string;
  comparedValue: string;
  changed: boolean;
};
type TemplateComparisonSubject = {
  label: string;
  category: string | null;
  description: string | null;
  changeNote: string | null;
  targetRole: "admin" | "photographer" | "all";
  status: TemplateStatusValue;
  filters: {
    status: EventFilterValue;
    date: EventDateFilterValue;
    quick: EventQuickFilterValue;
    searchQuery: string;
    sort: EventSortValue;
  };
};
type TemplateHistoryPairSelection = {
  first: number | null;
  second: number | null;
};
type SavedViewTemplateArchiveItem = {
  templateId: string;
  label: string;
  category: string | null;
  description: string | null;
  changeNote: string | null;
  targetRole: "admin" | "photographer" | "all";
  status: TemplateStatusValue;
  latestVersion: number;
  archivedAt: string;
  historyCount: number;
};
type SavedEventView = {
  id: string;
  label: string;
  category?: string | null;
  createdAt: string;
  order: number;
  pinned: boolean;
  sharedWithTeam: boolean;
  ownerEmail?: string | null;
  ownerName?: string | null;
  filters: {
    status: EventFilterValue;
    date: EventDateFilterValue;
    quick: EventQuickFilterValue;
    searchQuery: string;
    sort: EventSortValue;
  };
};

type SharedSavedViewUsageMap = Record<
  string,
  {
    applyCount: number;
    copyCount: number;
    lastUsedAt: string | null;
  }
>;

const EVENT_FILTER_OPTIONS: Array<{
  value: EventFilterValue;
  label: string;
}> = [
  { value: "all", label: "Tum" },
  { value: "draft", label: "Taslak" },
  { value: "published", label: "Canli" },
  { value: "completed", label: "Arsiv" }
];

const EVENT_DATE_FILTER_OPTIONS: Array<{
  value: EventDateFilterValue;
  label: string;
}> = [
  { value: "all", label: "Tum Tarihler" },
  { value: "upcoming", label: "Yaklasan" },
  { value: "past", label: "Gecmis" },
  { value: "undated", label: "Tarihsiz" }
];

const EVENT_QUICK_FILTER_OPTIONS: Array<{
  value: EventQuickFilterValue;
  label: string;
}> = [
  { value: "all", label: "Tum Icerik" },
  { value: "media_ready", label: "Medyasi Hazir" },
  { value: "cover_ready", label: "Kapak Hazir" }
];

const EVENT_SORT_OPTIONS: Array<{
  value: EventSortValue;
  label: string;
}> = [
  { value: "recent", label: "Son Eklenen" },
  { value: "event_date_asc", label: "Tarih Artan" },
  { value: "event_date_desc", label: "Tarih Azalan" },
  { value: "title_asc", label: "Ada Gore" }
];

const TEMPLATE_STATUS_OPTIONS: Array<{
  value: TemplateStatusValue;
  label: string;
}> = [
  { value: "draft", label: "Taslak" },
  { value: "published", label: "Yayinda" }
];

const SAVED_VIEW_TEMPLATE_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "photographer", label: "Fotografci" },
  { value: "all", label: "Tum Roller" }
] as const;

const EVENT_VIEW_PRESETS: Array<{
  id: EventViewPresetId;
  label: string;
  description: string;
  filters: {
    status: EventFilterValue;
    date: EventDateFilterValue;
    quick: EventQuickFilterValue;
    sort: EventSortValue;
  };
}> = [
  {
    id: "all_events",
    label: "Tum Etkinlikler",
    description: "Varsayilan liste gorunumu",
    filters: {
      status: "all",
      date: "all",
      quick: "all",
      sort: "recent"
    }
  },
  {
    id: "draft_review",
    label: "Taslak Kontrol",
    description: "Onizleme ve yayin oncesi takip",
    filters: {
      status: "draft",
      date: "all",
      quick: "all",
      sort: "recent"
    }
  },
  {
    id: "live_launches",
    label: "Canli Yaklasan",
    description: "Yaklasan yayindaki etkinlikler",
    filters: {
      status: "published",
      date: "upcoming",
      quick: "all",
      sort: "event_date_asc"
    }
  },
  {
    id: "archive_media",
    label: "Arsiv Medya",
    description: "Tamamlanmis ve medyasi hazir etkinlikler",
    filters: {
      status: "completed",
      date: "all",
      quick: "media_ready",
      sort: "event_date_desc"
    }
  },
  {
    id: "cover_ready",
    label: "Kapak Hazir",
    description: "Brand materyali tam etkinlikler",
    filters: {
      status: "all",
      date: "all",
      quick: "cover_ready",
      sort: "recent"
    }
  }
];

const ROLE_BASED_SAVED_VIEW_TEMPLATES: Record<string, SavedViewTemplate[]> = {
  admin: [
    {
      id: "admin-prelaunch",
      label: "Yayin Oncesi Kontrol",
      category: "Operasyon",
      description: "Taslak etkinlikleri onizleme ve yayin hazirligi icin toplar.",
      changeNote: "Admin on kontrol paketi.",
      targetRole: "admin",
      status: "published",
      version: 1,
      order: 0,
      filters: {
        status: "draft",
        date: "all",
        quick: "all",
        searchQuery: "",
        sort: "recent"
      }
    },
    {
      id: "admin-live",
      label: "Canli Lansman",
      category: "Yayin",
      description: "Yaklasan canli etkinlikleri tarih sirasi ile acik tutar.",
      changeNote: "Canli acilis akisi icin varsayilan set.",
      targetRole: "admin",
      status: "published",
      version: 1,
      order: 1,
      filters: {
        status: "published",
        date: "upcoming",
        quick: "all",
        searchQuery: "",
        sort: "event_date_asc"
      }
    },
    {
      id: "admin-archive",
      label: "Arsiv Medya Kontrolu",
      category: "Teslim",
      description: "Tamamlanmis ve medyasi hazir etkinlikleri bir araya getirir.",
      changeNote: "Teslim oncesi medya kontrol sablonu.",
      targetRole: "admin",
      status: "published",
      version: 1,
      order: 2,
      filters: {
        status: "completed",
        date: "all",
        quick: "media_ready",
        searchQuery: "",
        sort: "event_date_desc"
      }
    },
    {
      id: "admin-brand",
      label: "Kapak Brand Takibi",
      category: "Brand",
      description: "Kapak materyali hazir etkinlikleri hızlı kontrol eder.",
      changeNote: "Brand materyali tam etkinlikleri izler.",
      targetRole: "admin",
      status: "published",
      version: 1,
      order: 3,
      filters: {
        status: "all",
        date: "all",
        quick: "cover_ready",
        searchQuery: "",
        sort: "recent"
      }
    }
  ],
  photographer: [
    {
      id: "photographer-field",
      label: "Saha Hazirlik Listesi",
      category: "Saha",
      description: "Yaklasan etkinlikleri cekim gunu oncesi toplar.",
      changeNote: "Sahaya cikmadan onceki kontrol seti.",
      targetRole: "photographer",
      status: "published",
      version: 1,
      order: 0,
      filters: {
        status: "published",
        date: "upcoming",
        quick: "all",
        searchQuery: "",
        sort: "event_date_asc"
      }
    },
    {
      id: "photographer-media",
      label: "Yukleme Sonrasi",
      category: "Isleme",
      description: "Medyasi hazir etkinlikleri teslim oncesi ayirir.",
      changeNote: "Yukleme sonrasi teslim filtresi.",
      targetRole: "photographer",
      status: "published",
      version: 1,
      order: 1,
      filters: {
        status: "all",
        date: "all",
        quick: "media_ready",
        searchQuery: "",
        sort: "recent"
      }
    },
    {
      id: "photographer-brand",
      label: "Frame ve Logo Kontrol",
      category: "Brand",
      description: "Kapak ve brand materyalini sahaya cikmadan kontrol eder.",
      changeNote: "Frame ve logo hazirligini izler.",
      targetRole: "photographer",
      status: "published",
      version: 1,
      order: 2,
      filters: {
        status: "all",
        date: "all",
        quick: "cover_ready",
        searchQuery: "",
        sort: "recent"
      }
    }
  ]
};

const EVENT_ACCESS_CONFIG: Record<
  EventStatusValue,
  {
    pageLabel: string;
    urlLabel: string;
    copyLabel: string;
    openLabel: string;
    copySuccessMessage: string;
    helperTitle: string;
    helperText: string;
  }
> = {
  draft: {
    pageLabel: "Onizleme Sayfasi",
    urlLabel: "Onizleme URL",
    copyLabel: "Onizleme Linkini Kopyala",
    openLabel: "Onizlemeyi Ac",
    copySuccessMessage: "Onizleme linki kopyalandi.",
    helperTitle: "Taslak modunda sadece ekip gorur",
    helperText:
      "Bu link public feed'e dusmez. Admin girisi olan ekip uyeleri preview parametresi ile sayfayi kontrol eder."
  },
  published: {
    pageLabel: "Canli Misafir Sayfasi",
    urlLabel: "Canli URL",
    copyLabel: "Canli Linki Kopyala",
    openLabel: "Canli Sayfayi Ac",
    copySuccessMessage: "Canli misafir linki kopyalandi.",
    helperTitle: "Yayinda durumunda misafir akisi acilir",
    helperText:
      "Homepage ve public feed bu etkinligi gostermeye baslar. Misafirler link veya QR ile dogrudan galeriye ulasir."
  },
  completed: {
    pageLabel: "Arsiv Sayfasi",
    urlLabel: "Arsiv URL",
    copyLabel: "Arsiv Linkini Kopyala",
    openLabel: "Arsivi Ac",
    copySuccessMessage: "Arsiv linki kopyalandi.",
    helperTitle: "Tamamlandi durumunda galeri arsiv gibi calisir",
    helperText:
      "Etkinlik canli tanitimdan ayrilir ama baglanti korunur. Sonradan gelen misafirler arsiv galeriyi acmaya devam eder."
  }
};

function getEventStatusLabel(status: string) {
  return (
    EVENT_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

function getEventAccessConfig(status: string | null | undefined) {
  return EVENT_ACCESS_CONFIG[(status ?? "draft") as EventStatusValue] ?? EVENT_ACCESS_CONFIG.draft;
}

function isEventFilterValue(value: string | null): value is EventFilterValue {
  return EVENT_FILTER_OPTIONS.some((option) => option.value === value);
}

function isEventDateFilterValue(value: string | null): value is EventDateFilterValue {
  return EVENT_DATE_FILTER_OPTIONS.some((option) => option.value === value);
}

function isEventQuickFilterValue(value: string | null): value is EventQuickFilterValue {
  return EVENT_QUICK_FILTER_OPTIONS.some((option) => option.value === value);
}

function isEventSortValue(value: string | null): value is EventSortValue {
  return EVENT_SORT_OPTIONS.some((option) => option.value === value);
}

function getOptionLabel<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getUserRoleLabel(role: string | null | undefined) {
  if (role === "admin") {
    return "Admin";
  }
  if (role === "photographer") {
    return "Fotoğrafçı";
  }
  return role ?? "-";
}

function formatTemplateHistoryValue(
  value: string | null | undefined,
  fallback: string
) {
  const normalizedValue = (value ?? "").trim();
  return normalizedValue || fallback;
}

function getArchivedRestoreVersion(changeNote: string | null | undefined) {
  const normalizedValue = formatTemplateHistoryValue(changeNote, "");
  const matchedVersion = normalizedValue.match(/Arsivden v(\d+) geri yuklendi\./i);
  return matchedVersion ? Number.parseInt(matchedVersion[1] ?? "", 10) : null;
}

function parsePositiveVersion(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function parseTemplateHistoryPair(value: string | null): TemplateHistoryPairSelection {
  if (!value) {
    return {
      first: null,
      second: null
    };
  }

  const [firstRaw, secondRaw] = value.split(",", 2);
  const first = parsePositiveVersion(firstRaw ?? null);
  let second = parsePositiveVersion(secondRaw ?? null);

  if (first !== null && second !== null && first === second) {
    second = null;
  }

  return {
    first,
    second
  };
}

function buildTemplateHistoryDiffSummary(
  current: SavedViewTemplateHistoryItem,
  previous: SavedViewTemplateHistoryItem | null
) {
  if (!previous) {
    return ["Ilk kaydedilen surum."];
  }

  const summary: string[] = [];

  if (current.label !== previous.label) {
    summary.push(`Baslik: ${previous.label} -> ${current.label}`);
  }

  const previousCategory = formatTemplateHistoryValue(previous.category, "Kategori yok");
  const currentCategory = formatTemplateHistoryValue(current.category, "Kategori yok");
  if (currentCategory !== previousCategory) {
    summary.push(`Paket: ${previousCategory} -> ${currentCategory}`);
  }

  const previousDescription = formatTemplateHistoryValue(previous.description, "Aciklama yok");
  const currentDescription = formatTemplateHistoryValue(current.description, "Aciklama yok");
  if (currentDescription !== previousDescription) {
    summary.push(`Aciklama: ${previousDescription} -> ${currentDescription}`);
  }

  const previousChangeNote = formatTemplateHistoryValue(previous.changeNote, "Not yok");
  const currentChangeNote = formatTemplateHistoryValue(current.changeNote, "Not yok");
  if (currentChangeNote !== previousChangeNote) {
    summary.push(`Not: ${previousChangeNote} -> ${currentChangeNote}`);
  }

  if (current.targetRole !== previous.targetRole) {
    summary.push(
      `Rol: ${getOptionLabel(SAVED_VIEW_TEMPLATE_ROLE_OPTIONS, previous.targetRole)} -> ${getOptionLabel(
        SAVED_VIEW_TEMPLATE_ROLE_OPTIONS,
        current.targetRole
      )}`
    );
  }

  if (current.status !== previous.status) {
    summary.push(
      `Durum: ${getOptionLabel(TEMPLATE_STATUS_OPTIONS, previous.status)} -> ${getOptionLabel(
        TEMPLATE_STATUS_OPTIONS,
        current.status
      )}`
    );
  }

  if (current.filters.status !== previous.filters.status) {
    summary.push(
      `Liste durumu: ${getOptionLabel(EVENT_FILTER_OPTIONS, previous.filters.status)} -> ${getOptionLabel(
        EVENT_FILTER_OPTIONS,
        current.filters.status
      )}`
    );
  }

  if (current.filters.date !== previous.filters.date) {
    summary.push(
      `Tarih: ${getOptionLabel(EVENT_DATE_FILTER_OPTIONS, previous.filters.date)} -> ${getOptionLabel(
        EVENT_DATE_FILTER_OPTIONS,
        current.filters.date
      )}`
    );
  }

  if (current.filters.quick !== previous.filters.quick) {
    summary.push(
      `Icerik: ${getOptionLabel(EVENT_QUICK_FILTER_OPTIONS, previous.filters.quick)} -> ${getOptionLabel(
        EVENT_QUICK_FILTER_OPTIONS,
        current.filters.quick
      )}`
    );
  }

  const previousSearchQuery = formatTemplateHistoryValue(
    previous.filters.searchQuery,
    "Arama yok"
  );
  const currentSearchQuery = formatTemplateHistoryValue(current.filters.searchQuery, "Arama yok");
  if (currentSearchQuery !== previousSearchQuery) {
    summary.push(`Arama: ${previousSearchQuery} -> ${currentSearchQuery}`);
  }

  if (current.filters.sort !== previous.filters.sort) {
    summary.push(
      `Siralama: ${getOptionLabel(EVENT_SORT_OPTIONS, previous.filters.sort)} -> ${getOptionLabel(
        EVENT_SORT_OPTIONS,
        current.filters.sort
      )}`
    );
  }

  return summary.length ? summary : ["Bu surumde alan degisimi yok, yalnizca yeniden kaydedildi."];
}

function toTemplateComparisonSubject(
  template: SavedViewTemplate | SavedViewTemplateHistoryItem
): TemplateComparisonSubject {
  return {
    label: template.label,
    category: template.category,
    description: template.description,
    changeNote: template.changeNote,
    targetRole: template.targetRole,
    status: template.status,
    filters: template.filters
  };
}

function buildTemplateComparisonRows(
  currentTemplate: TemplateComparisonSubject,
  comparedTemplate: TemplateComparisonSubject
) {
  const rows: TemplateComparisonRow[] = [
    {
      label: "Baslik",
      currentValue: currentTemplate.label,
      comparedValue: comparedTemplate.label,
      changed: currentTemplate.label !== comparedTemplate.label
    },
    {
      label: "Paket",
      currentValue: formatTemplateHistoryValue(currentTemplate.category, "Kategori yok"),
      comparedValue: formatTemplateHistoryValue(comparedTemplate.category, "Kategori yok"),
      changed: currentTemplate.category !== comparedTemplate.category
    },
    {
      label: "Aciklama",
      currentValue: formatTemplateHistoryValue(currentTemplate.description, "Aciklama yok"),
      comparedValue: formatTemplateHistoryValue(comparedTemplate.description, "Aciklama yok"),
      changed: currentTemplate.description !== comparedTemplate.description
    },
    {
      label: "Degisiklik notu",
      currentValue: formatTemplateHistoryValue(currentTemplate.changeNote, "Not yok"),
      comparedValue: formatTemplateHistoryValue(comparedTemplate.changeNote, "Not yok"),
      changed: currentTemplate.changeNote !== comparedTemplate.changeNote
    },
    {
      label: "Hedef rol",
      currentValue: getOptionLabel(SAVED_VIEW_TEMPLATE_ROLE_OPTIONS, currentTemplate.targetRole),
      comparedValue: getOptionLabel(
        SAVED_VIEW_TEMPLATE_ROLE_OPTIONS,
        comparedTemplate.targetRole
      ),
      changed: currentTemplate.targetRole !== comparedTemplate.targetRole
    },
    {
      label: "Durum",
      currentValue: getOptionLabel(TEMPLATE_STATUS_OPTIONS, currentTemplate.status),
      comparedValue: getOptionLabel(TEMPLATE_STATUS_OPTIONS, comparedTemplate.status),
      changed: currentTemplate.status !== comparedTemplate.status
    },
    {
      label: "Liste durumu",
      currentValue: getOptionLabel(EVENT_FILTER_OPTIONS, currentTemplate.filters.status),
      comparedValue: getOptionLabel(EVENT_FILTER_OPTIONS, comparedTemplate.filters.status),
      changed: currentTemplate.filters.status !== comparedTemplate.filters.status
    },
    {
      label: "Tarih",
      currentValue: getOptionLabel(EVENT_DATE_FILTER_OPTIONS, currentTemplate.filters.date),
      comparedValue: getOptionLabel(EVENT_DATE_FILTER_OPTIONS, comparedTemplate.filters.date),
      changed: currentTemplate.filters.date !== comparedTemplate.filters.date
    },
    {
      label: "Icerik",
      currentValue: getOptionLabel(EVENT_QUICK_FILTER_OPTIONS, currentTemplate.filters.quick),
      comparedValue: getOptionLabel(EVENT_QUICK_FILTER_OPTIONS, comparedTemplate.filters.quick),
      changed: currentTemplate.filters.quick !== comparedTemplate.filters.quick
    },
    {
      label: "Arama",
      currentValue: formatTemplateHistoryValue(currentTemplate.filters.searchQuery, "Arama yok"),
      comparedValue: formatTemplateHistoryValue(comparedTemplate.filters.searchQuery, "Arama yok"),
      changed: currentTemplate.filters.searchQuery !== comparedTemplate.filters.searchQuery
    },
    {
      label: "Siralama",
      currentValue: getOptionLabel(EVENT_SORT_OPTIONS, currentTemplate.filters.sort),
      comparedValue: getOptionLabel(EVENT_SORT_OPTIONS, comparedTemplate.filters.sort),
      changed: currentTemplate.filters.sort !== comparedTemplate.filters.sort
    }
  ];

  return rows;
}

function buildQrCodeUrl(targetUrl: string, cacheKey?: string | null) {
  const query = new URLSearchParams({
    size: "260x260",
    data: targetUrl,
    margin: "0"
  });
  if (cacheKey) {
    query.set("cache", cacheKey);
  }
  return `https://api.qrserver.com/v1/create-qr-code/?${query.toString()}`;
}

function resolveShareOrigin(currentOrigin: string) {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    const isLocalhost =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    if (!isLocalhost) {
      return currentOrigin.replace(/\/$/, "");
    }
  }

  if (shareBaseUrl.trim()) {
    return shareBaseUrl.replace(/\/$/, "");
  }
  return currentOrigin.replace(/\/$/, "");
}

function formatDate(value: string | null) {
  if (!value) return "Tarih yok";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatDateTime(dateValue: string | null, timeValue?: string | null) {
  const dateLabel = formatDate(dateValue);
  if (!timeValue) {
    return dateLabel;
  }
  return `${dateLabel} ${timeValue}`;
}

function getEventCoverImage(event: EventItem | null) {
  return event?.materials?.selected_cover ?? event?.materials?.covers?.[0] ?? null;
}

function getGuestPath(event: EventItem | null) {
  if (!event) return "";
  return event.status === "draft" ? `/e/${event.slug}?preview=1` : `/e/${event.slug}`;
}

function getGuestLinkLabel(event: EventItem | null) {
  return getEventAccessConfig(event?.status).pageLabel;
}

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Dosya okunamadi."));
    };
    reader.onerror = () => reject(new Error("Dosya okunamadi."));
    reader.readAsDataURL(file);
  });
}

function matchesEventSearch(event: EventItem, query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return true;
  }

  const searchStack = [
    event.title,
    event.slug,
    event.location,
    event.event_date,
    event.event_time,
    formatDate(event.event_date),
    formatDateTime(event.event_date, event.event_time)
  ]
    .map((item) => normalizeSearchValue(item))
    .join(" ");

  return searchStack.includes(normalizedQuery);
}

function matchesEventDateFilter(
  eventDate: string | null,
  filter: EventDateFilterValue,
  today: Date
) {
  if (filter === "all") {
    return true;
  }

  if (!eventDate) {
    return filter === "undated";
  }

  const parsedDate = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return filter === "undated";
  }

  if (filter === "upcoming") {
    return parsedDate >= today;
  }

  if (filter === "past") {
    return parsedDate < today;
  }

  return false;
}

function matchesEventQuickFilter(event: EventItem, quickFilter: EventQuickFilterValue) {
  if (quickFilter === "all") {
    return true;
  }

  if (quickFilter === "media_ready") {
    return (event.photo_count ?? 0) > 0;
  }

  if (quickFilter === "cover_ready") {
    return !!getEventCoverImage(event);
  }

  return true;
}

function getEventDateTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.getTime();
}

function sortEventsByPreference(items: EventItem[], sortValue: EventSortValue) {
  const sortedItems = [...items];

  if (sortValue === "title_asc") {
    return sortedItems.sort((left, right) => left.title.localeCompare(right.title, "tr"));
  }

  if (sortValue === "event_date_asc") {
    return sortedItems.sort((left, right) => {
      const leftTime = getEventDateTimestamp(left.event_date) ?? Number.MAX_SAFE_INTEGER;
      const rightTime = getEventDateTimestamp(right.event_date) ?? Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });
  }

  if (sortValue === "event_date_desc") {
    return sortedItems.sort((left, right) => {
      const leftTime = getEventDateTimestamp(left.event_date) ?? Number.MIN_SAFE_INTEGER;
      const rightTime = getEventDateTimestamp(right.event_date) ?? Number.MIN_SAFE_INTEGER;
      return rightTime - leftTime;
    });
  }

  return sortedItems;
}

function filterEventsByControls(
  items: EventItem[],
  {
    searchQuery,
    dateFilter,
    quickFilter,
    statusFilter,
    sortValue,
    today
  }: {
    searchQuery: string;
    dateFilter: EventDateFilterValue;
    quickFilter: EventQuickFilterValue;
    statusFilter: EventFilterValue;
    sortValue: EventSortValue;
    today: Date;
  }
) {
  const searchFilteredItems = items.filter(
    (event) =>
      matchesEventSearch(event, searchQuery) &&
      matchesEventDateFilter(event.event_date, dateFilter, today) &&
      matchesEventQuickFilter(event, quickFilter)
  );
  const sortedSearchFilteredItems = sortEventsByPreference(searchFilteredItems, sortValue);

  return {
    searchFilteredItems: sortedSearchFilteredItems,
    visibleItems:
      statusFilter === "all"
        ? sortedSearchFilteredItems
        : sortedSearchFilteredItems.filter((event) => event.status === statusFilter)
  };
}

function hasFilterQueryParams(searchParams: URLSearchParams) {
  return adminFilterQueryKeys.some((key) => searchParams.has(key));
}

function getSavedViewsStorageKey(userEmail: string) {
  return `${adminSavedViewsStorageKeyPrefix}:${userEmail.toLowerCase()}`;
}

function getSharedSavedViewFavoritesStorageKey(userEmail: string) {
  return `${adminSharedSavedViewFavoritesStorageKeyPrefix}:${userEmail.toLowerCase()}`;
}

function getSharedSavedViewUsageStorageKey(userEmail: string) {
  return `${adminSharedSavedViewUsageStorageKeyPrefix}:${userEmail.toLowerCase()}`;
}

function normalizeSavedViewLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeSavedViewCategory(value: string | null | undefined) {
  const normalizedValue = (value ?? "").trim().replace(/\s+/g, " ");
  return normalizedValue || null;
}

function normalizeSavedViewTemplateDescription(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeSavedViewTemplateChangeNote(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeSavedViewTemplateRole(
  value: string | null | undefined
): SavedViewTemplate["targetRole"] {
  if (value === "admin" || value === "photographer" || value === "all") {
    return value;
  }
  return "photographer";
}

function normalizeSavedViewTemplateStatus(value: string | null | undefined): TemplateStatusValue {
  return value === "published" ? "published" : "draft";
}

function normalizeSavedViewTemplates(
  items: Array<Partial<SavedViewTemplate> | null | undefined>
) {
  return items
    .filter((item): item is Partial<SavedViewTemplate> => !!item)
    .map((item, index) => {
      const rawStatus = item.filters?.status ?? null;
      const rawDate = item.filters?.date ?? null;
      const rawQuick = item.filters?.quick ?? null;
      const rawSort = item.filters?.sort ?? null;
      const targetRole: SavedViewTemplate["targetRole"] = normalizeSavedViewTemplateRole(
        item.targetRole
      );
      const status: TemplateStatusValue = normalizeSavedViewTemplateStatus(item.status);

      return {
        id:
          typeof item.id === "string" && item.id ? item.id : `template-${Date.now()}-${index}`,
        label: normalizeSavedViewLabel(
          typeof item.label === "string" ? item.label : "Yeni Sablon"
        ),
        category: normalizeSavedViewCategory(item.category) ?? "Genel",
        description:
          normalizeSavedViewTemplateDescription(item.description) ||
          "Merkezi sablon aciklamasi eklenmedi.",
        changeNote: normalizeSavedViewTemplateChangeNote(item.changeNote),
        targetRole,
        status,
        version: typeof item.version === "number" && item.version > 0 ? item.version : 1,
        order: typeof item.order === "number" ? item.order : index,
        filters: {
          status: isEventFilterValue(rawStatus) ? rawStatus : "all",
          date: isEventDateFilterValue(rawDate) ? rawDate : "all",
          quick: isEventQuickFilterValue(rawQuick) ? rawQuick : "all",
          searchQuery:
            typeof item.filters?.searchQuery === "string"
              ? item.filters.searchQuery.trim()
              : "",
          sort: isEventSortValue(rawSort) ? rawSort : "recent"
        }
      };
    })
    .sort((left, right) => left.order - right.order)
    .map((item, index) => ({
      ...item,
      order: index
    }));
}

function getFallbackSavedViewTemplates(role: string | null | undefined) {
  if (role === "admin") {
    return normalizeSavedViewTemplates([
      ...ROLE_BASED_SAVED_VIEW_TEMPLATES.admin,
      ...ROLE_BASED_SAVED_VIEW_TEMPLATES.photographer
    ]);
  }

  return normalizeSavedViewTemplates(ROLE_BASED_SAVED_VIEW_TEMPLATES.photographer);
}

function createSavedViewId(prefix: string, index: number) {
  return `${prefix}-${Date.now()}-${index}`;
}

function coerceSavedView(
  item: Partial<SavedEventView> | null | undefined,
  index: number
): SavedEventView | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const label = normalizeSavedViewLabel(typeof item.label === "string" ? item.label : "");
  if (!label) {
    return null;
  }

  const rawFilters =
    item.filters && typeof item.filters === "object"
      ? (item.filters as Partial<SavedEventView["filters"]>)
      : {};
  const normalizedOrder =
    typeof item.order === "number" && Number.isFinite(item.order) ? item.order : index;
  const rawStatus = rawFilters.status ?? null;
  const rawDate = rawFilters.date ?? null;
  const rawQuick = rawFilters.quick ?? null;
  const rawSort = rawFilters.sort ?? null;
  const status: EventFilterValue = isEventFilterValue(rawStatus) ? rawStatus : "all";
  const date: EventDateFilterValue = isEventDateFilterValue(rawDate) ? rawDate : "all";
  const quick: EventQuickFilterValue = isEventQuickFilterValue(rawQuick) ? rawQuick : "all";
  const sort: EventSortValue = isEventSortValue(rawSort) ? rawSort : "recent";

  return {
    id: typeof item.id === "string" && item.id ? item.id : createSavedViewId("view", index),
    label,
    category: normalizeSavedViewCategory(item.category),
    createdAt:
      typeof item.createdAt === "string" && item.createdAt ? item.createdAt : new Date().toISOString(),
    order: normalizedOrder,
    pinned: item.pinned ?? false,
    sharedWithTeam: item.sharedWithTeam ?? false,
    ownerEmail: typeof item.ownerEmail === "string" ? item.ownerEmail : null,
    ownerName: typeof item.ownerName === "string" ? item.ownerName : null,
    filters: {
      status,
      date,
      quick,
      searchQuery: typeof rawFilters.searchQuery === "string" ? rawFilters.searchQuery.trim() : "",
      sort
    }
  };
}

function sortSavedViews(items: SavedEventView[]) {
  return [...items].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function normalizeSavedViews(items: Array<Partial<SavedEventView> | null | undefined>) {
  return sortSavedViews(
    items
      .map((item, index) => coerceSavedView(item, index))
      .filter((item): item is SavedEventView => !!item)
  ).map((item, index) => ({
    ...item,
    order: index
  }));
}

export default function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmptyMode = searchParams.get("empty") === "true";
  const savedViewsImportInputRef = useRef<HTMLInputElement | null>(null);
  const [token, setToken] = useState<string>("");
  const [appOrigin, setAppOrigin] = useState("");
  const [email, setEmail] = useState("admin@findmyshot.app");
  const [password, setPassword] = useState("admin123");
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [openEventMenuId, setOpenEventMenuId] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStatus, setEventStatus] = useState("draft");
  const [eventDistributionMode, setEventDistributionMode] = useState<"free" | "paid">("paid");
  const [eventStatusFilter, setEventStatusFilter] = useState<EventFilterValue>("all");
  const [eventDateFilter, setEventDateFilter] = useState<EventDateFilterValue>("all");
  const [eventQuickFilter, setEventQuickFilter] = useState<EventQuickFilterValue>("all");
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventSort, setEventSort] = useState<EventSortValue>("recent");
  const [selectedEventSlugFromUrl, setSelectedEventSlugFromUrl] = useState("");
  const [savedViewTemplates, setSavedViewTemplates] = useState<SavedViewTemplate[]>([]);
  const [savedViews, setSavedViews] = useState<SavedEventView[]>([]);
  const [sharedSavedViews, setSharedSavedViews] = useState<SavedEventView[]>([]);
  const [sharedSavedViewSearchQuery, setSharedSavedViewSearchQuery] = useState("");
  const [sharedSavedViewCategoryFilter, setSharedSavedViewCategoryFilter] = useState("all");
  const [favoriteSharedSavedViewIds, setFavoriteSharedSavedViewIds] = useState<string[]>([]);
  const [sharedSavedViewUsageMap, setSharedSavedViewUsageMap] = useState<SharedSavedViewUsageMap>({});
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateChangeNote, setTemplateChangeNote] = useState("");
  const [templateTargetRole, setTemplateTargetRole] = useState<"admin" | "photographer" | "all">(
    "photographer"
  );
  const [templateStatus, setTemplateStatus] = useState<TemplateStatusValue>("draft");
  const [templateStatusFilter, setTemplateStatusFilter] = useState<"all" | TemplateStatusValue>("all");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [openTemplateHistoryId, setOpenTemplateHistoryId] = useState<string | null>(null);
  const [templateHistoryById, setTemplateHistoryById] = useState<
    Record<string, SavedViewTemplateHistoryItem[]>
  >({});
  const [templateHistoryLoadingId, setTemplateHistoryLoadingId] = useState<string | null>(null);
  const [templateCompareVersionById, setTemplateCompareVersionById] = useState<
    Record<string, number | null>
  >({});
  const [templateHistoryPairById, setTemplateHistoryPairById] = useState<
    Record<string, TemplateHistoryPairSelection>
  >({});
  const [archivedTemplateItems, setArchivedTemplateItems] = useState<
    SavedViewTemplateArchiveItem[]
  >([]);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViewCategory, setSavedViewCategory] = useState("");
  const [editingSavedViewId, setEditingSavedViewId] = useState<string | null>(null);
  const [editingSavedViewName, setEditingSavedViewName] = useState("");
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [uploadOverallProgress, setUploadOverallProgress] = useState(0);
  const [showUploadQueueDetails, setShowUploadQueueDetails] = useState(true);
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [frameColor, setFrameColor] = useState<string | null>("#ffffff");
  const [frameThickness, setFrameThickness] = useState<number>(32);
  const [logoAsset, setLogoAsset] = useState<string | null>(null);
  const [qrLogo, setQrLogo] = useState<string | null>(null);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>({ x: 0, y: 0, size: 100 });
  const [eventPhotographers, setEventPhotographers] = useState<Record<string, EventPhotographerRow[]>>({});
  const [visibleEventPhotographerPasswords, setVisibleEventPhotographerPasswords] = useState<
    Record<string, boolean>
  >({});
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [eventMessage, setEventMessage] = useState<string | null>(null);
  const [materialSaveNotice, setMaterialSaveNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [viewShareMessage, setViewShareMessage] = useState<string | null>(null);
  const [savedViewMessage, setSavedViewMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarStateReady, setSidebarStateReady] = useState(false);
  const [adminSidebarPanel, setAdminSidebarPanel] = useState<AdminSidebarPanel>("event");
  const [adminMainPanel, setAdminMainPanel] = useState<AdminMainPanel>("studio");
  const [adminEventDetailTab, setAdminEventDetailTab] = useState<AdminEventDetailTab>("general");
  const [photoGalleryFilter, setPhotoGalleryFilter] = useState<PhotoGalleryFilter>("all");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const quickBannerInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  function readCachedSavedViews(userEmail: string) {
    const storageKey = getSavedViewsStorageKey(userEmail);
    const storedViews = window.localStorage.getItem(storageKey);
    if (!storedViews) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedViews) as SavedEventView[];
      return Array.isArray(parsed) ? normalizeSavedViews(parsed) : [];
    } catch {
      window.localStorage.removeItem(storageKey);
      return [];
    }
  }

  function cacheSavedViews(userEmail: string, items: SavedEventView[]) {
    window.localStorage.setItem(
      getSavedViewsStorageKey(userEmail),
      JSON.stringify(normalizeSavedViews(items))
    );
  }

  function readSharedSavedViewFavorites(userEmail: string) {
    const storedValue = window.localStorage.getItem(
      getSharedSavedViewFavoritesStorageKey(userEmail)
    );
    if (!storedValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedValue) as string[];
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      window.localStorage.removeItem(getSharedSavedViewFavoritesStorageKey(userEmail));
      return [];
    }
  }

  function cacheSharedSavedViewFavorites(userEmail: string, items: string[]) {
    window.localStorage.setItem(
      getSharedSavedViewFavoritesStorageKey(userEmail),
      JSON.stringify(items)
    );
  }

  function readSharedSavedViewUsage(userEmail: string) {
    const storedValue = window.localStorage.getItem(getSharedSavedViewUsageStorageKey(userEmail));
    if (!storedValue) {
      return {};
    }

    try {
      const parsed = JSON.parse(storedValue) as SharedSavedViewUsageMap;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      window.localStorage.removeItem(getSharedSavedViewUsageStorageKey(userEmail));
      return {};
    }
  }

  function cacheSharedSavedViewUsage(userEmail: string, usageMap: SharedSavedViewUsageMap) {
    window.localStorage.setItem(
      getSharedSavedViewUsageStorageKey(userEmail),
      JSON.stringify(usageMap)
    );
  }

  function formatRelativeDateTime(value: string | null) {
    if (!value) {
      return "Henuz kullanilmadi";
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return "Henuz kullanilmadi";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(parsedDate);
  }

  function normalizeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatSlugInput(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+/, "");
  }

  function resetEventForm() {
    setEventTitle("");
    setEventSlug("");
    setEventDate("");
    setEventTime("");
    setEventLocation("");
    setEventStatus("draft");
    setEventDistributionMode("paid");
    setCoverImages([]);
    setSelectedCover(null);
  }

  function startCreatingEvent() {
    setIsCreatingEvent(true);
    setSelectedEventId("");
    setAdminSidebarPanel("event");
    setAdminMainPanel("settings");
    resetEventForm();
    setEventMessage(null);
    setUploadMessage(null);
    setShareMessage(null);
    setUploadFiles(null);
    setUploadQueue([]);
    setUploadOverallProgress(0);
  }

  function resetListFilters() {
    setEventStatusFilter("all");
    setEventDateFilter("all");
    setEventQuickFilter("all");
    setEventSearchQuery("");
    setEventSort("recent");
  }

  function applyListFilters(filters: {
    status: EventFilterValue;
    date: EventDateFilterValue;
    quick: EventQuickFilterValue;
    searchQuery: string;
    sort: EventSortValue;
  }) {
    setEventStatusFilter(filters.status);
    setEventDateFilter(filters.date);
    setEventQuickFilter(filters.quick);
    setEventSearchQuery(filters.searchQuery);
    setEventSort(filters.sort);
  }

  function upsertSavedView(
    nextViewInput: Pick<SavedEventView, "label" | "category" | "filters"> & {
      successMessage: string;
    }
  ) {
    const normalizedLabel = normalizeSavedViewLabel(nextViewInput.label);
    const normalizedCategory = normalizeSavedViewCategory(nextViewInput.category);
    const existing = savedViews.find(
      (item) =>
        normalizeSavedViewLabel(item.label).toLowerCase() === normalizedLabel.toLowerCase()
    );

    if (existing) {
      const nextViews = savedViews.map((item) =>
        item.id === existing.id
          ? {
              ...item,
              label: normalizedLabel,
              category: normalizedCategory,
              filters: nextViewInput.filters
            }
          : item
      );
      persistSavedViews(nextViews);
      setSavedViewMessage(nextViewInput.successMessage);
      return;
    }

    const nextView: SavedEventView = {
      id: `view-${Date.now()}`,
      label: normalizedLabel,
      category: normalizedCategory,
      createdAt: new Date().toISOString(),
      order: savedViews.length,
      pinned: false,
      sharedWithTeam: false,
      ownerEmail: null,
      ownerName: null,
      filters: nextViewInput.filters
    };
    persistSavedViews([...savedViews, nextView]);
    setSavedViewMessage(nextViewInput.successMessage);
  }

  function resetTemplateForm() {
    setTemplateName("");
    setTemplateCategory("");
    setTemplateDescription("");
    setTemplateChangeNote("");
    setTemplateTargetRole(user?.role === "admin" ? "photographer" : "all");
    setTemplateStatus("draft");
    setEditingTemplateId(null);
  }

  async function loadTemplateHistory(templateId: string) {
    if (!token || user?.role !== "admin") {
      return;
    }

    setTemplateHistoryLoadingId(templateId);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/saved-view-templates/${templateId}/history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Sablon gecmisi yuklenemedi.");
      }

      const payload = (await response.json()) as { items?: SavedViewTemplateHistoryItem[] };
      setTemplateHistoryById((current) => ({
        ...current,
        [templateId]: payload.items ?? []
      }));
    } catch (error) {
      setSavedViewMessage(
        error instanceof Error ? error.message : "Sablon gecmisi yuklenemedi."
      );
    } finally {
      setTemplateHistoryLoadingId(null);
    }
  }

  function toggleTemplateHistory(templateId: string) {
    if (openTemplateHistoryId === templateId) {
      setOpenTemplateHistoryId(null);
      setTemplateCompareVersionById((current) => ({
        ...current,
        [templateId]: null
      }));
      setTemplateHistoryPairById((current) => ({
        ...current,
        [templateId]: {
          first: null,
          second: null
        }
      }));
      return;
    }

    setOpenTemplateHistoryId(templateId);
    if (!templateHistoryById[templateId]) {
      void loadTemplateHistory(templateId);
    }
  }

  function persistSavedViewTemplates(nextTemplates: SavedViewTemplate[]) {
    const normalizedTemplates = normalizeSavedViewTemplates(nextTemplates);
    setSavedViewTemplates(normalizedTemplates);
    setTemplateHistoryById({});
    setTemplateCompareVersionById({});
    setTemplateHistoryPairById({});
    setOpenTemplateHistoryId(null);
    if (!token || user?.role !== "admin") {
      return;
    }

    void syncSavedViewTemplatesToApi(normalizedTemplates, token)
      .then((syncedTemplates) => {
        setSavedViewTemplates(syncedTemplates);
      })
      .catch((error) => {
        setSavedViewMessage(
          error instanceof Error ? error.message : "Merkezi sablonlar kaydedilemedi."
        );
      });
  }

  function saveCurrentFiltersAsTemplate() {
    if (user?.role !== "admin") {
      return;
    }

    const nextLabel = normalizeSavedViewLabel(templateName);
    if (!nextLabel) {
      setSavedViewMessage("Merkezi sablon icin bir baslik gir.");
      return;
    }

    const existingTemplate = savedViewTemplates.find((item) => item.id === editingTemplateId);

    const nextTemplate: SavedViewTemplate = {
      id: editingTemplateId ?? `template-${Date.now()}`,
      label: nextLabel,
      category: normalizeSavedViewCategory(templateCategory) ?? "Genel",
      description:
        normalizeSavedViewTemplateDescription(templateDescription) ||
        "Merkezi sablon aciklamasi eklenmedi.",
      changeNote:
        normalizeSavedViewTemplateChangeNote(templateChangeNote) ||
        (existingTemplate ? "Sablon icerigi guncellendi." : "Ilk surum olusturuldu."),
      targetRole: templateTargetRole,
      status: templateStatus,
      version: existingTemplate ? existingTemplate.version + 1 : 1,
      order: savedViewTemplates.length,
      filters: {
        status: eventStatusFilter,
        date: eventDateFilter,
        quick: eventQuickFilter,
        searchQuery: eventSearchQuery.trim(),
        sort: eventSort
      }
    };
    const nextTemplates = existingTemplate
      ? savedViewTemplates.map((item) =>
          item.id === existingTemplate.id
            ? {
                ...nextTemplate,
                order: item.order
              }
            : item
        )
      : [...savedViewTemplates, nextTemplate];

    persistSavedViewTemplates(nextTemplates);
    setSavedViewMessage(
      `"${nextLabel}" merkezi sablon olarak ${
        existingTemplate ? "guncellendi" : "kaydedildi"
      }.`
    );
    resetTemplateForm();
  }

  function startEditingTemplate(templateId: string) {
    const targetTemplate = savedViewTemplates.find((item) => item.id === templateId);
    if (!targetTemplate) {
      return;
    }

    setEditingTemplateId(templateId);
    setTemplateName(targetTemplate.label);
    setTemplateCategory(targetTemplate.category);
    setTemplateDescription(targetTemplate.description);
    setTemplateChangeNote(targetTemplate.changeNote);
    setTemplateTargetRole(targetTemplate.targetRole);
    setTemplateStatus(targetTemplate.status);
    applyListFilters(targetTemplate.filters);
    setSavedViewMessage(`"${targetTemplate.label}" merkezi sablonu duzenlemeye hazir.`);
  }

  function deleteTemplate(templateId: string) {
    const targetTemplate = savedViewTemplates.find((item) => item.id === templateId);
    if (!targetTemplate) {
      return;
    }

    persistSavedViewTemplates(savedViewTemplates.filter((item) => item.id !== templateId));
    setSavedViewMessage(`"${targetTemplate.label}" merkezi sablonlardan silindi.`);
    if (editingTemplateId === templateId) {
      resetTemplateForm();
    }
  }

  function updateTemplateStatus(templateId: string, nextStatus: TemplateStatusValue) {
    const targetTemplate = savedViewTemplates.find((item) => item.id === templateId);
    if (!targetTemplate || targetTemplate.status === nextStatus) {
      return;
    }

    const nextTemplates = savedViewTemplates.map((item) =>
      item.id === templateId
        ? {
            ...item,
            status: nextStatus,
            version: item.version + 1
          }
        : item
    );
    persistSavedViewTemplates(nextTemplates);
    setSavedViewMessage(
      `"${targetTemplate.label}" ${nextStatus === "published" ? "yayina alindi" : "taslaga cekildi"}.`
    );
    if (editingTemplateId === templateId) {
      setTemplateStatus(nextStatus);
    }
  }

  async function rollbackTemplateVersion(templateId: string, version: number) {
    if (!token || user?.role !== "admin") {
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/saved-view-templates/${templateId}/rollback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ version })
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Sablon geri alinamadi.");
      }

      const rolledBackTemplate = (await response.json()) as SavedViewTemplate;
      setSavedViewTemplates((current) =>
        normalizeSavedViewTemplates(
          current.map((item) => (item.id === templateId ? rolledBackTemplate : item))
        )
      );
      await loadTemplateHistory(templateId);
      setSavedViewMessage(
        `"${rolledBackTemplate.label}" v${version} icerigine geri alindi.`
      );
      if (editingTemplateId === templateId) {
        setEditingTemplateId(templateId);
        setTemplateName(rolledBackTemplate.label);
        setTemplateCategory(rolledBackTemplate.category);
        setTemplateDescription(rolledBackTemplate.description);
        setTemplateChangeNote(rolledBackTemplate.changeNote);
        setTemplateTargetRole(rolledBackTemplate.targetRole);
        setTemplateStatus(rolledBackTemplate.status);
        applyListFilters(rolledBackTemplate.filters);
      }
    } catch (error) {
      setSavedViewMessage(
        error instanceof Error ? error.message : "Sablon geri alinamadi."
      );
    }
  }

  async function deleteArchivedTemplateHistory(templateId: string) {
    if (!token || user?.role !== "admin") {
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/saved-view-template-archives/${templateId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Arsivlenmis history temizlenemedi.");
      }

      const payload = (await response.json()) as {
        templateId: string;
        removedVersions: number;
      };
      setArchivedTemplateItems((current) =>
        current.filter((item) => item.templateId !== payload.templateId)
      );
      setTemplateHistoryById((current) => {
        const nextHistory = { ...current };
        delete nextHistory[payload.templateId];
        return nextHistory;
      });
      if (openTemplateHistoryId === payload.templateId) {
        setOpenTemplateHistoryId(null);
      }
      setSavedViewMessage(`Arsiv history temizlendi (${payload.removedVersions} surum).`);
    } catch (error) {
      setSavedViewMessage(
        error instanceof Error ? error.message : "Arsivlenmis history temizlenemedi."
      );
    }
  }

  async function restoreArchivedTemplate(templateId: string, version?: number) {
    if (!token || user?.role !== "admin") {
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/saved-view-template-archives/${templateId}/restore`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(version ? { version } : {})
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Arsivden geri yukleme basarisiz.");
      }

      const restoredTemplate = (await response.json()) as SavedViewTemplate;
      setSavedViewMessage(
        `"${restoredTemplate.label}" arsivden ${
          version ? `v${version}` : "son surum"
        } ile geri yuklendi.`
      );
      await hydrateDashboard(token);
      setEditingTemplateId(restoredTemplate.id);
      setTemplateName(restoredTemplate.label);
      setTemplateCategory(restoredTemplate.category);
      setTemplateDescription(restoredTemplate.description);
      setTemplateChangeNote(restoredTemplate.changeNote);
      setTemplateTargetRole(restoredTemplate.targetRole);
      setTemplateStatus(restoredTemplate.status);
      applyListFilters(restoredTemplate.filters);
    } catch (error) {
      setSavedViewMessage(
        error instanceof Error ? error.message : "Arsivden geri yukleme basarisiz."
      );
    }
  }

  function toggleTemplateVersionComparison(templateId: string, version: number) {
    setTemplateCompareVersionById((current) => ({
      ...current,
      [templateId]: current[templateId] === version ? null : version
    }));
  }

  function setTemplateHistoryPairVersion(
    templateId: string,
    slot: keyof TemplateHistoryPairSelection,
    version: number
  ) {
    setTemplateHistoryPairById((current) => {
      const currentSelection = current[templateId] ?? { first: null, second: null };
      const nextSelection = {
        ...currentSelection,
        [slot]: currentSelection[slot] === version ? null : version
      };
      if (
        nextSelection.first !== null &&
        nextSelection.second !== null &&
        nextSelection.first === nextSelection.second
      ) {
        nextSelection.second = null;
      }
      return {
        ...current,
        [templateId]: nextSelection
      };
    });
  }

  function applyViewPreset(presetId: EventViewPresetId) {
    const preset = EVENT_VIEW_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    applyListFilters({
      status: preset.filters.status,
      date: preset.filters.date,
      quick: preset.filters.quick,
      searchQuery: "",
      sort: preset.filters.sort
    });
  }

  function updateQueueItem(
    fileName: string,
    updater: (current: UploadQueueItem) => UploadQueueItem
  ) {
    setUploadQueue((current) =>
      current.map((item) => (item.fileName === fileName ? updater(item) : item))
    );
  }

  function uploadPhotoWithProgress(file: File, eventId: string, authToken: string) {
    return new Promise<void>((resolve, reject) => {
      const formData = new FormData();
      formData.append("event_id", eventId);
      formData.append("file", file);

      const request = new XMLHttpRequest();
      request.open("POST", `${apiBaseUrl}/api/photos/upload`);
      request.setRequestHeader("Authorization", `Bearer ${authToken}`);

      request.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        const nextProgress = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100
        );
        updateQueueItem(file.name, (item) => ({
          ...item,
          progress: Math.max(item.progress, nextProgress),
          status: "uploading"
        }));
      };

      request.onload = () => {
        let payload: { detail?: string } = {};
        try {
          payload = JSON.parse(request.responseText) as { detail?: string };
        } catch {
          payload = {};
        }

        if (request.status >= 200 && request.status < 300) {
          updateQueueItem(file.name, (item) => ({
            ...item,
            progress: 100,
            status: "done"
          }));
          resolve();
          return;
        }

        updateQueueItem(file.name, (item) => ({
          ...item,
          status: "error",
          errorMessage: payload.detail ?? `${file.name} yüklenemedi.`
        }));
        reject(new Error(payload.detail ?? `${file.name} yüklenemedi.`));
      };

      request.onerror = () => {
        updateQueueItem(file.name, (item) => ({
          ...item,
          status: "error",
          errorMessage: `${file.name} yüklenirken ağ hatası oluştu.`
        }));
        reject(new Error(`${file.name} yüklenirken ağ hatası oluştu.`));
      };

      updateQueueItem(file.name, (item) => ({
        ...item,
        status: "uploading",
        errorMessage: undefined
      }));
      request.send(formData);
    });
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(adminTokenStorageKey);
    if (stored) {
      setToken(stored);
    }
    const searchParams = new URLSearchParams(window.location.search);
    const urlSelectedEventSlug = searchParams.get(adminSelectedEventQueryKey);
    const urlOpenTemplateHistoryId = searchParams.get(adminTemplateHistoryQueryKey)?.trim() ?? "";
    const urlTemplateCompareVersion = parsePositiveVersion(
      searchParams.get(adminTemplateCompareQueryKey)
    );
    const urlTemplateHistoryPair = parseTemplateHistoryPair(
      searchParams.get(adminTemplatePairQueryKey)
    );
    if (urlSelectedEventSlug) {
      setSelectedEventSlugFromUrl(urlSelectedEventSlug);
    }
    if (urlOpenTemplateHistoryId) {
      setOpenTemplateHistoryId(urlOpenTemplateHistoryId);
      if (urlTemplateCompareVersion !== null) {
        setTemplateCompareVersionById({
          [urlOpenTemplateHistoryId]: urlTemplateCompareVersion
        });
      }
      if (urlTemplateHistoryPair.first !== null || urlTemplateHistoryPair.second !== null) {
        setTemplateHistoryPairById({
          [urlOpenTemplateHistoryId]: urlTemplateHistoryPair
        });
      }
    }
    if (hasFilterQueryParams(searchParams)) {
      const urlStatus = searchParams.get("status");
      const urlDate = searchParams.get("date");
      const urlQuick = searchParams.get("quick");
      const urlSearch = searchParams.get("q");
      const urlSort = searchParams.get("sort");

      setEventStatusFilter(isEventFilterValue(urlStatus) ? urlStatus : "all");
      setEventDateFilter(isEventDateFilterValue(urlDate) ? urlDate : "all");
      setEventQuickFilter(isEventQuickFilterValue(urlQuick) ? urlQuick : "all");
      setEventSearchQuery(urlSearch ?? "");
      setEventSort(isEventSortValue(urlSort) ? urlSort : "recent");
    } else {
      const storedPreferences = window.localStorage.getItem(adminEventPreferencesStorageKey);
      if (storedPreferences) {
        try {
          const parsed = JSON.parse(storedPreferences) as {
            statusFilter?: EventFilterValue;
            dateFilter?: EventDateFilterValue;
            quickFilter?: EventQuickFilterValue;
            searchQuery?: string;
            sortValue?: EventSortValue;
          };
          if (parsed.statusFilter) {
            setEventStatusFilter(parsed.statusFilter);
          }
          if (parsed.dateFilter) {
            setEventDateFilter(parsed.dateFilter);
          }
          if (parsed.quickFilter) {
            setEventQuickFilter(parsed.quickFilter);
          }
          if (typeof parsed.searchQuery === "string") {
            setEventSearchQuery(parsed.searchQuery);
          }
          if (parsed.sortValue) {
            setEventSort(parsed.sortValue);
          }
        } catch {
          window.localStorage.removeItem(adminEventPreferencesStorageKey);
        }
      }
    }
    const storedSelectedEventId = window.localStorage.getItem(adminSelectedEventStorageKey);
    if (storedSelectedEventId) {
      setSelectedEventId(storedSelectedEventId);
    }
    setAppOrigin(window.location.origin);
    setSidebarStateReady(true);
  }, []);

  useEffect(() => {
    setAdminEventDetailTab("general");
  }, [selectedEventId]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setEvents([]);
      setPhotos([]);
      setSummary(null);
      setSavedViewTemplates([]);
      setArchivedTemplateItems([]);
      setOpenTemplateHistoryId(null);
      setTemplateCompareVersionById({});
      setTemplateHistoryPairById({});
      setSavedViews([]);
      setSharedSavedViews([]);
      setSharedSavedViewCategoryFilter("all");
      setFavoriteSharedSavedViewIds([]);
      setSharedSavedViewUsageMap({});
      return;
    }

    window.localStorage.setItem(adminTokenStorageKey, token);
    void hydrateDashboard(token);
  }, [token]);

  useEffect(() => {
    if (!sidebarStateReady) {
      return;
    }

    window.localStorage.setItem(
      adminEventPreferencesStorageKey,
      JSON.stringify({
        statusFilter: eventStatusFilter,
        dateFilter: eventDateFilter,
        quickFilter: eventQuickFilter,
        searchQuery: eventSearchQuery,
        sortValue: eventSort
      })
    );
  }, [
    eventDateFilter,
    eventQuickFilter,
    eventSearchQuery,
    eventSort,
    eventStatusFilter,
    sidebarStateReady
  ]);

  useEffect(() => {
    if (!sidebarStateReady) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (eventStatusFilter === "all") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", eventStatusFilter);
    }

    if (eventDateFilter === "all") {
      searchParams.delete("date");
    } else {
      searchParams.set("date", eventDateFilter);
    }

    if (eventQuickFilter === "all") {
      searchParams.delete("quick");
    } else {
      searchParams.set("quick", eventQuickFilter);
    }

    if (eventSearchQuery.trim()) {
      searchParams.set("q", eventSearchQuery.trim());
    } else {
      searchParams.delete("q");
    }

    if (eventSort === "recent") {
      searchParams.delete("sort");
    } else {
      searchParams.set("sort", eventSort);
    }

    if (selectedEventSlug) {
      searchParams.set(adminSelectedEventQueryKey, selectedEventSlug);
    } else {
      searchParams.delete(adminSelectedEventQueryKey);
    }

    if (openTemplateHistoryId) {
      searchParams.set(adminTemplateHistoryQueryKey, openTemplateHistoryId);

      const compareVersion = templateCompareVersionById[openTemplateHistoryId] ?? null;
      if (compareVersion !== null) {
        searchParams.set(adminTemplateCompareQueryKey, String(compareVersion));
      } else {
        searchParams.delete(adminTemplateCompareQueryKey);
      }

      const pairSelection = templateHistoryPairById[openTemplateHistoryId] ?? {
        first: null,
        second: null
      };
      if (pairSelection.first !== null || pairSelection.second !== null) {
        const firstValue = pairSelection.first !== null ? String(pairSelection.first) : "";
        const secondValue = pairSelection.second !== null ? String(pairSelection.second) : "";
        searchParams.set(adminTemplatePairQueryKey, `${firstValue},${secondValue}`);
      } else {
        searchParams.delete(adminTemplatePairQueryKey);
      }
    } else {
      searchParams.delete(adminTemplateHistoryQueryKey);
      searchParams.delete(adminTemplateCompareQueryKey);
      searchParams.delete(adminTemplatePairQueryKey);
    }

    const queryString = searchParams.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [
    eventDateFilter,
    events,
    eventQuickFilter,
    eventSearchQuery,
    eventSort,
    eventStatusFilter,
    openTemplateHistoryId,
    selectedEventId,
    sidebarStateReady,
    templateCompareVersionById,
    templateHistoryPairById
  ]);

  useEffect(() => {
    if (!token || user?.role !== "admin" || !openTemplateHistoryId) {
      return;
    }

    if (templateHistoryById[openTemplateHistoryId] || templateHistoryLoadingId === openTemplateHistoryId) {
      return;
    }

    void loadTemplateHistory(openTemplateHistoryId);
  }, [
    openTemplateHistoryId,
    templateHistoryById,
    templateHistoryLoadingId,
    token,
    user?.role
  ]);

  useEffect(() => {
    if (!sidebarStateReady) {
      return;
    }

    if (!selectedEventId) {
      window.localStorage.removeItem(adminSelectedEventStorageKey);
      return;
    }

    window.localStorage.setItem(adminSelectedEventStorageKey, selectedEventId);
  }, [selectedEventId, sidebarStateReady]);

  useEffect(() => {
    if (!selectedEventId || !token) {
      setPhotos([]);
      return;
    }

    void loadPhotos(token, selectedEventId);
  }, [selectedEventId, token]);

  useEffect(() => {
    if (
      sharedSavedViewCategoryFilter !== "all" &&
      !sharedSavedViews.some(
        (view) => normalizeSavedViewCategory(view.category) === sharedSavedViewCategoryFilter
      )
    ) {
      setSharedSavedViewCategoryFilter("all");
    }
  }, [sharedSavedViewCategoryFilter, sharedSavedViews]);

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    const activeEvent = events.find((item) => item.id === selectedEventId);
    if (!activeEvent) {
      return;
    }

    setIsCreatingEvent(false);
    setEventTitle(activeEvent.title);
    setEventSlug(activeEvent.slug);
    setEventDate(activeEvent.event_date ?? "");
    setEventTime(activeEvent.event_time ?? "");
    setEventLocation(activeEvent.location ?? "");
    setEventStatus(activeEvent.status ?? "draft");
    setEventDistributionMode(
      activeEvent.materials?.distribution_mode === "free" ? "free" : "paid"
    );
    setCoverImages(activeEvent.materials?.covers ?? []);
    setSelectedCover(
      activeEvent.materials?.selected_cover ??
        activeEvent.materials?.covers?.[0] ??
        null
    );
    setFrameColor(activeEvent.materials?.frame_color ?? "#ffffff");
    setFrameThickness(activeEvent.materials?.frame_thickness ?? 32);
    setLogoAsset(activeEvent.materials?.logo_asset ?? null);
    setQrLogo(activeEvent.materials?.qr_logo ?? null);
    setLogoPlacement(
      activeEvent.materials?.logo_placement ?? { x: 0, y: 0, size: 100 }
    );
    setEventPhotographers((current) => ({
      ...current,
      [activeEvent.id]: (activeEvent.assigned_photographers ?? []).map((photographer) => ({
        id: photographer.id,
        name: photographer.name,
        email: photographer.email,
        password: photographer.password ?? "",
        saved: true
      }))
    }));
    setEventMessage(null);
  }, [selectedEventId, events]);

  useEffect(() => {
    if (isCreatingEvent) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextFilteredEvents = filterEventsByControls(events, {
      searchQuery: eventSearchQuery,
      dateFilter: eventDateFilter,
      quickFilter: eventQuickFilter,
      statusFilter: eventStatusFilter,
      sortValue: eventSort,
      today
    }).visibleItems;

    if (nextFilteredEvents.some((item) => item.id === selectedEventId)) {
      return;
    }

    const nextVisibleEvent = nextFilteredEvents[0];
    if (nextVisibleEvent) {
      setSelectedEventId(nextVisibleEvent.id);
      setOpenEventMenuId(null);
    }
  }, [
    eventDateFilter,
    eventQuickFilter,
    eventSearchQuery,
    eventSort,
    eventStatusFilter,
    events,
    isCreatingEvent,
    selectedEventId
  ]);

  async function loadArchivedTemplateItems(activeToken: string) {
    const response = await fetch(`${apiBaseUrl}/api/auth/saved-view-template-archives`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(payload?.detail ?? "Arsivlenmis sablon gecmisi yuklenemedi.");
    }

    const payload = (await response.json()) as { items?: SavedViewTemplateArchiveItem[] };
    return (payload.items ?? []).map((item) => ({
      templateId: item.templateId,
      label: normalizeSavedViewLabel(item.label),
      category: normalizeSavedViewCategory(item.category),
      description: normalizeSavedViewTemplateDescription(item.description) || null,
      changeNote: normalizeSavedViewTemplateChangeNote(item.changeNote) || null,
      targetRole: normalizeSavedViewTemplateRole(item.targetRole),
      status: normalizeSavedViewTemplateStatus(item.status),
      latestVersion:
        typeof item.latestVersion === "number" && item.latestVersion > 0
          ? item.latestVersion
          : 1,
      archivedAt:
        typeof item.archivedAt === "string" && item.archivedAt
          ? item.archivedAt
          : new Date().toISOString(),
      historyCount:
        typeof item.historyCount === "number" && item.historyCount > 0 ? item.historyCount : 0
    }));
  }

  async function hydrateDashboard(activeToken: string) {
    try {
      const [
        meResponse,
        eventsResponse,
        summaryResponse,
        savedViewsResponse,
        savedViewTemplatesResponse,
        archivedTemplateResponse
      ] = await Promise.all([
        fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        }),
        fetch(`${apiBaseUrl}/api/events`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        }),
        fetch(`${apiBaseUrl}/api/events/dashboard-summary`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        }),
        fetch(`${apiBaseUrl}/api/auth/saved-views`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        }),
        fetch(`${apiBaseUrl}/api/auth/saved-view-templates`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        }),
        fetch(`${apiBaseUrl}/api/auth/saved-view-template-archives`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        })
      ]);

      if (!meResponse.ok || !eventsResponse.ok) {
        throw new Error("Oturum süresi doldu. Lütfen tekrar giriş yap.");
      }

      const mePayload = (await meResponse.json()) as User;
      const eventsPayload = (await eventsResponse.json()) as { items: EventItem[] };
      const summaryPayload = summaryResponse.ok
        ? ((await summaryResponse.json()) as { summary?: DashboardSummary })
        : null;
      const savedViewsPayload = savedViewsResponse.ok
        ? ((await savedViewsResponse.json()) as {
            items?: SavedEventView[];
            shared_items?: SavedEventView[];
          })
        : null;
      const savedViewTemplatesPayload = savedViewTemplatesResponse.ok
        ? ((await savedViewTemplatesResponse.json()) as {
            items?: SavedViewTemplate[];
          })
        : null;
      const archivedTemplatePayload =
        archivedTemplateResponse.ok && mePayload.role === "admin"
          ? ((await archivedTemplateResponse.json()) as {
              items?: SavedViewTemplateArchiveItem[];
            })
          : null;
      const cachedSavedViews = readCachedSavedViews(mePayload.email);
      const cachedSharedFavorites = readSharedSavedViewFavorites(mePayload.email);
      const cachedSharedUsage = readSharedSavedViewUsage(mePayload.email);
      let nextSavedViews = savedViewsPayload
        ? normalizeSavedViews(savedViewsPayload.items ?? [])
        : cachedSavedViews;
      const nextSharedSavedViews = normalizeSavedViews(savedViewsPayload?.shared_items ?? []);

      if (nextSavedViews.length === 0 && cachedSavedViews.length > 0) {
        try {
          nextSavedViews = await syncSavedViewsToApi(
            cachedSavedViews,
            activeToken,
            mePayload.email
          );
        } catch {
          nextSavedViews = cachedSavedViews;
        }
      } else {
        cacheSavedViews(mePayload.email, nextSavedViews);
      }

      setUser(mePayload);
      setEvents(eventsPayload.items);
      setSummary(summaryPayload?.summary ?? null);
      setSavedViewTemplates(
        savedViewTemplatesPayload?.items?.length
          ? normalizeSavedViewTemplates(savedViewTemplatesPayload.items)
          : getFallbackSavedViewTemplates(mePayload.role)
      );
      setArchivedTemplateItems(
        mePayload.role === "admin"
          ? (archivedTemplatePayload?.items ?? []).map((item) => ({
              templateId: item.templateId,
              label: normalizeSavedViewLabel(item.label),
              category: normalizeSavedViewCategory(item.category),
              description: normalizeSavedViewTemplateDescription(item.description) || null,
              changeNote: normalizeSavedViewTemplateChangeNote(item.changeNote) || null,
              targetRole: normalizeSavedViewTemplateRole(item.targetRole),
              status: normalizeSavedViewTemplateStatus(item.status),
              latestVersion:
                typeof item.latestVersion === "number" && item.latestVersion > 0
                  ? item.latestVersion
                  : 1,
              archivedAt:
                typeof item.archivedAt === "string" && item.archivedAt
                  ? item.archivedAt
                  : new Date().toISOString(),
              historyCount:
                typeof item.historyCount === "number" && item.historyCount > 0
                  ? item.historyCount
                  : 0
            }))
          : []
      );
      setSavedViews(nextSavedViews);
      setSharedSavedViews(nextSharedSavedViews);
      setFavoriteSharedSavedViewIds(
        cachedSharedFavorites.filter((item) =>
          nextSharedSavedViews.some((view) => view.id === item)
        )
      );
      const nextSharedUsageMap = Object.fromEntries(
        Object.entries(cachedSharedUsage).filter(([viewId]) =>
          nextSharedSavedViews.some((view) => view.id === viewId)
        )
      ) as SharedSavedViewUsageMap;
      setSharedSavedViewUsageMap(nextSharedUsageMap);
      cacheSharedSavedViewUsage(mePayload.email, nextSharedUsageMap);
      if (eventsPayload.items.length === 0) {
        startCreatingEvent();
      } else {
        const selectedFromUrl = selectedEventSlugFromUrl
          ? eventsPayload.items.find((item) => item.slug === selectedEventSlugFromUrl)?.id ?? ""
          : "";
        const selectedFromCurrentState = selectedEventId
          ? eventsPayload.items.find((item) => item.id === selectedEventId)?.id ?? ""
          : "";
        setSelectedEventId(
          selectedFromUrl || selectedFromCurrentState || eventsPayload.items[0]?.id || ""
        );
      }
    } catch (error) {
      window.localStorage.removeItem(adminTokenStorageKey);
      setToken("");
      setAuthMessage(error instanceof Error ? error.message : "Giriş gerekli.");
    }
  }

  async function syncSavedViewsToApi(
    nextViews: SavedEventView[],
    activeToken: string,
    userEmail: string
  ) {
    const response = await fetch(`${apiBaseUrl}/api/auth/saved-views`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeToken}`
      },
      body: JSON.stringify({ items: normalizeSavedViews(nextViews) })
    });

    if (!response.ok) {
      throw new Error("Kayitli gorunumler senkronize edilemedi.");
    }

    const payload = (await response.json()) as {
      items?: SavedEventView[];
      shared_items?: SavedEventView[];
    };
    const normalizedViews = normalizeSavedViews(payload.items ?? nextViews);
    setSharedSavedViews(normalizeSavedViews(payload.shared_items ?? sharedSavedViews));
    cacheSavedViews(userEmail, normalizedViews);
    return normalizedViews;
  }

  async function syncSavedViewTemplatesToApi(
    nextTemplates: SavedViewTemplate[],
    activeToken: string
  ) {
    const response = await fetch(`${apiBaseUrl}/api/auth/saved-view-templates`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeToken}`
      },
      body: JSON.stringify({ items: normalizeSavedViewTemplates(nextTemplates) })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(payload?.detail ?? "Merkezi sablonlar guncellenemedi.");
    }

    const payload = (await response.json()) as { items?: SavedViewTemplate[] };
    try {
      setArchivedTemplateItems(await loadArchivedTemplateItems(activeToken));
    } catch {
      setArchivedTemplateItems([]);
    }
    return normalizeSavedViewTemplates(payload.items ?? nextTemplates);
  }

  async function loadPhotos(activeToken: string, eventId: string) {
    const response = await fetch(`${apiBaseUrl}/api/photos/event/${eventId}`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    });

    if (!response.ok) {
      setPhotos([]);
      return;
    }

    const payload = (await response.json()) as { items: PhotoItem[] };
    setPhotos(payload.items);
    setEvents((current) =>
      current.map((item) =>
        item.id === eventId ? { ...item, photo_count: payload.items.length } : item
      )
    );
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setAuthMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "Giriş başarısız.");
      }

      setToken(payload.access_token as string);
      setAuthMessage("Giriş başarılı.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(adminTokenStorageKey);
    window.localStorage.removeItem(adminSelectedEventStorageKey);
    setToken("");
    setUser(null);
    setEvents([]);
    setSelectedEventId("");
    setPhotos([]);
    setAuthMessage("Çıkış yapıldı.");
    router.push("/admin/login");
  }

  function closeEventMenu() {
    setOpenEventMenuId(null);
  }

  async function copyGuestLink(link: string, status: string | null | undefined) {
    try {
      await navigator.clipboard.writeText(link);
      setShareMessage(getEventAccessConfig(status).copySuccessMessage);
    } catch {
      setShareMessage("Otomatik kopyalanamadı. Linki manuel kopyalayın.");
    }
  }

  function isPhotographerPasswordVisible(photographerId: number | string) {
    return Boolean(visibleEventPhotographerPasswords[String(photographerId)]);
  }

  function togglePhotographerPasswordVisibility(photographerId: number | string) {
    const key = String(photographerId);
    setVisibleEventPhotographerPasswords((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  function getMaskedPhotographerPassword(password: string) {
    return password.trim() ? "******" : "";
  }

  function buildPhotographerInviteLink(email: string) {
    if (!selectedEvent || !photographerInviteBaseUrl) {
      return "";
    }

    const query = new URLSearchParams({
      event: selectedEvent.slug
    });
    if (email.trim()) {
      query.set("email", email.trim());
    }
    return `${photographerInviteBaseUrl}?${query.toString()}`;
  }

  async function copyPhotographerInvite(photographer: EventPhotographerRow) {
    const inviteLink = buildPhotographerInviteLink(photographer.email);
    const inviteText = [
      `Ad: ${photographer.name.trim()}`,
      `E-posta: ${photographer.email.trim()}`,
      `Sifre: ${photographer.password.trim() || "—"}`,
      `Giris linki: ${inviteLink || "link hazirlanamadi"}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(inviteText);
      setEventMessage(`"${photographer.name.trim()}" icin davet bilgileri kopyalandi.`);
    } catch {
      setEventMessage("Davet bilgileri otomatik kopyalanamadi.");
    }
  }

  function downloadQrCode() {
    if (!qrPreviewUrl || !selectedEvent) {
      return;
    }

    const link = document.createElement("a");
    link.href = qrPreviewUrl;
    link.download = `${selectedEvent.slug}-qr.png`;
    link.click();
  }

  async function copyAdminViewLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setViewShareMessage("Admin gorunumu linki kopyalandi.");
    } catch {
      setViewShareMessage("Admin gorunumu linki otomatik kopyalanamadi.");
    }
  }

  async function copyTemplateComparisonLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSavedViewMessage("Template karsilastirma linki kopyalandi.");
    } catch {
      setSavedViewMessage("Template karsilastirma linki otomatik kopyalanamadi.");
    }
  }

  function persistSavedViews(nextViews: SavedEventView[]) {
    const normalizedViews = normalizeSavedViews(nextViews);
    setSavedViews(normalizedViews);
    if (!user) {
      return;
    }

    cacheSavedViews(user.email, normalizedViews);
    if (!token) {
      return;
    }

    void syncSavedViewsToApi(normalizedViews, token, user.email)
      .then((syncedViews) => {
        setSavedViews(syncedViews);
      })
      .catch((error) => {
        setSavedViewMessage(
          error instanceof Error
            ? error.message
            : "Kayitli gorunumler sadece bu cihazda saklandi."
        );
      });
  }

  function saveCurrentView() {
    const nextLabel = normalizeSavedViewLabel(savedViewName);
    if (!nextLabel) {
      setSavedViewMessage("Kaydetmek icin gorunume bir isim ver.");
      return;
    }

    const nextFilters = {
      status: eventStatusFilter,
      date: eventDateFilter,
      quick: eventQuickFilter,
      searchQuery: eventSearchQuery.trim(),
      sort: eventSort
    };
    upsertSavedView({
      label: nextLabel,
      category: savedViewCategory,
      filters: nextFilters,
      successMessage: `"${
        nextLabel
      }" ${savedViews.some((item) => normalizeSavedViewLabel(item.label).toLowerCase() === nextLabel.toLowerCase()) ? "guncellendi" : "kaydedildi"}.`
    });
    setSavedViewName("");
    setSavedViewCategory("");
  }

  function applySuggestedSavedViewTemplate(template: SavedViewTemplate) {
    applyListFilters(template.filters);
    setSavedViewName(template.label);
    setSavedViewCategory(template.category);
    setSavedViewMessage(`"${template.label}" forma yerlestirildi.`);
  }

  function saveSuggestedSavedViewTemplate(template: SavedViewTemplate) {
    const exists = savedViews.some(
      (item) =>
        normalizeSavedViewLabel(item.label).toLowerCase() ===
        normalizeSavedViewLabel(template.label).toLowerCase()
    );
    upsertSavedView({
      label: template.label,
      category: template.category,
      filters: template.filters,
      successMessage: `"${template.label}" ${exists ? "guncellendi" : "hazir set olarak kaydedildi"}.`
    });
  }

  function applySavedView(viewId: string) {
    const targetView = [...savedViews, ...sharedSavedViews].find((item) => item.id === viewId);
    if (!targetView) {
      return;
    }

    applyListFilters(targetView.filters);
    if (targetView.ownerEmail) {
      recordSharedSavedViewUsage(viewId, "apply");
    }
    setSavedViewMessage(
      targetView.ownerEmail
        ? `"${targetView.label}" ekip gorunumunden acildi.`
        : `"${targetView.label}" acildi.`
    );
  }

  function deleteSavedView(viewId: string) {
    const targetView = savedViews.find((item) => item.id === viewId);
    if (!targetView) {
      return;
    }

    const nextViews = savedViews.filter((item) => item.id !== viewId);
    persistSavedViews(nextViews);
    setSavedViewMessage(`"${targetView.label}" silindi.`);
  }

  function toggleSavedViewPinned(viewId: string) {
    const targetView = savedViews.find((item) => item.id === viewId);
    if (!targetView) {
      return;
    }

    const nextViews = savedViews.map((item) =>
      item.id === viewId
        ? {
            ...item,
            pinned: !item.pinned
          }
        : item
    );
    persistSavedViews(nextViews);
    setSavedViewMessage(
      targetView.pinned
        ? `"${targetView.label}" sabitlerden cikarildi.`
        : `"${targetView.label}" ustte sabitlendi.`
    );
  }

  function toggleSavedViewShared(viewId: string) {
    const targetView = savedViews.find((item) => item.id === viewId);
    if (!targetView) {
      return;
    }

    const nextViews = savedViews.map((item) =>
      item.id === viewId
        ? {
            ...item,
            sharedWithTeam: !item.sharedWithTeam
          }
        : item
    );
    persistSavedViews(nextViews);
    setSavedViewMessage(
      targetView.sharedWithTeam
        ? `"${targetView.label}" ekip paylasimindan kaldirildi.`
        : `"${targetView.label}" ekip ile paylasildi.`
    );
  }

  function moveSavedView(viewId: string, direction: "up" | "down") {
    const targetView = savedViews.find((item) => item.id === viewId);
    if (!targetView) {
      return;
    }

    const groupViews = savedViews.filter((item) => item.pinned === targetView.pinned);
    const groupIndex = groupViews.findIndex((item) => item.id === viewId);
    const nextIndex = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    const swapTarget = groupViews[nextIndex];
    if (!swapTarget) {
      return;
    }

    const nextViews = savedViews.map((item) => {
      if (item.id === targetView.id) {
        return {
          ...item,
          order: swapTarget.order
        };
      }

      if (item.id === swapTarget.id) {
        return {
          ...item,
          order: targetView.order
        };
      }

      return item;
    });

    persistSavedViews(nextViews);
    setSavedViewMessage(
      `"${targetView.label}" ${direction === "up" ? "yukari" : "asagi"} tasindi.`
    );
  }

  function exportSavedViews() {
    if (!savedViews.length) {
      setSavedViewMessage("Disari aktarmak icin once en az bir gorunum kaydet.");
      return;
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      owner: user?.email ?? null,
      views: savedViews
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const exportLabel = normalizeSlug((user?.email ?? "admin").split("@")[0] || "admin");

    link.href = url;
    link.download = `findmyshot-saved-views-${exportLabel}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    setSavedViewMessage("Kayitli gorunumler JSON olarak disari aktarildi.");
  }

  function openSavedViewsImport() {
    savedViewsImportInputRef.current?.click();
  }

  async function importSavedViews(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as { views?: Array<Partial<SavedEventView>> } | Array<Partial<SavedEventView>>;
      const importedItems = Array.isArray(parsed) ? parsed : parsed.views;
      if (!Array.isArray(importedItems)) {
        setSavedViewMessage("Import dosyasi gecerli gorunum listesi icermiyor.");
        return;
      }

      const normalizedImportedViews = normalizeSavedViews(importedItems).map((view, index) => ({
        ...view,
        id: createSavedViewId("view-import", index),
        ownerEmail: null,
        ownerName: null
      }));
      if (!normalizedImportedViews.length) {
        setSavedViewMessage("Import dosyasinda kullanilabilir gorunum bulunamadi.");
        return;
      }

      const importedViewMap = new Map(
        normalizedImportedViews.map((view) => [
          normalizeSavedViewLabel(view.label).toLowerCase(),
          view
        ])
      );
      const nextViews = [
        ...savedViews.filter(
          (view) => !importedViewMap.has(normalizeSavedViewLabel(view.label).toLowerCase())
        ),
        ...Array.from(importedViewMap.values())
      ];

      persistSavedViews(nextViews);
      setSavedViewMessage(`${normalizedImportedViews.length} gorunum ice aktarildi.`);
    } catch {
      setSavedViewMessage("Import dosyasi okunamadi. Gecerli bir JSON sec.");
    }
  }

  function startRenamingSavedView(viewId: string) {
    const targetView = savedViews.find((item) => item.id === viewId);
    if (!targetView) {
      return;
    }

    setEditingSavedViewId(viewId);
    setEditingSavedViewName(targetView.label);
    setSavedViewMessage(null);
  }

  function cancelRenamingSavedView() {
    setEditingSavedViewId(null);
    setEditingSavedViewName("");
  }

  function renameSavedView(viewId: string) {
    const targetView = savedViews.find((item) => item.id === viewId);
    if (!targetView) {
      return;
    }

    const nextLabel = normalizeSavedViewLabel(editingSavedViewName);
    if (!nextLabel) {
      setSavedViewMessage("Yeni isim bos birakilamaz.");
      return;
    }

    const duplicate = savedViews.find(
      (item) =>
        item.id !== viewId &&
        normalizeSavedViewLabel(item.label).toLowerCase() === nextLabel.toLowerCase()
    );
    if (duplicate) {
      setSavedViewMessage("Ayni isimde baska bir gorunum zaten var.");
      return;
    }

    const nextViews = savedViews.map((item) =>
      item.id === viewId
        ? {
            ...item,
            label: nextLabel
          }
        : item
    );
    persistSavedViews(nextViews);
    setSavedViewMessage(`"${targetView.label}" yeniden adlandirildi.`);
    cancelRenamingSavedView();
  }

  function createUniqueSavedViewLabel(baseLabel: string) {
    let nextLabel = normalizeSavedViewLabel(baseLabel);
    let suffix = 2;
    const existingLabels = new Set(
      savedViews.map((item) => normalizeSavedViewLabel(item.label).toLowerCase())
    );

    while (existingLabels.has(nextLabel.toLowerCase())) {
      nextLabel = `${baseLabel} ${suffix}`;
      suffix += 1;
    }

    return nextLabel;
  }

  function copySharedViewToMine(viewId: string) {
    const targetView = sharedSavedViews.find((item) => item.id === viewId);
    if (!targetView) {
      return;
    }

    const ownerLabel = targetView.ownerName ?? targetView.ownerEmail ?? "Ekip";
    const nextView: SavedEventView = {
      ...targetView,
      id: createSavedViewId("view-copy", savedViews.length),
      label: createUniqueSavedViewLabel(`${targetView.label} - ${ownerLabel}`),
      createdAt: new Date().toISOString(),
      order: savedViews.length,
      pinned: false,
      sharedWithTeam: false,
      ownerEmail: null,
      ownerName: null
    };
    persistSavedViews([...savedViews, nextView]);
    recordSharedSavedViewUsage(viewId, "copy");
    setSavedViewMessage(`"${targetView.label}" kendi gorunumlerine kopyalandi.`);
  }

  function toggleSharedSavedViewFavorite(viewId: string) {
    if (!user) {
      return;
    }

    const targetView = sharedSavedViews.find((item) => item.id === viewId);
    if (!targetView) {
      return;
    }

    const nextFavorites = favoriteSharedSavedViewIds.includes(viewId)
      ? favoriteSharedSavedViewIds.filter((item) => item !== viewId)
      : [viewId, ...favoriteSharedSavedViewIds];

    setFavoriteSharedSavedViewIds(nextFavorites);
    cacheSharedSavedViewFavorites(user.email, nextFavorites);
    setSavedViewMessage(
      favoriteSharedSavedViewIds.includes(viewId)
        ? `"${targetView.label}" favorilerden cikarildi.`
        : `"${targetView.label}" ekip favorilerine eklendi.`
    );
  }

  function recordSharedSavedViewUsage(viewId: string, action: "apply" | "copy") {
    if (!user) {
      return;
    }

    setSharedSavedViewUsageMap((current) => {
      const currentUsage = current[viewId] ?? {
        applyCount: 0,
        copyCount: 0,
        lastUsedAt: null
      };
      const nextUsageMap = {
        ...current,
        [viewId]: {
          applyCount: currentUsage.applyCount + (action === "apply" ? 1 : 0),
          copyCount: currentUsage.copyCount + (action === "copy" ? 1 : 0),
          lastUsedAt: new Date().toISOString()
        }
      };
      cacheSharedSavedViewUsage(user.email, nextUsageMap);
      return nextUsageMap;
    });
  }

  function applyOverviewShortcut(shortcut: "all" | "draft" | "upcoming" | "past" | "media_ready" | "cover_ready") {
    resetListFilters();
    if (shortcut === "all") {
      return;
    }
    if (shortcut === "draft") {
      setEventStatusFilter("draft");
      return;
    }
    if (shortcut === "upcoming") {
      setEventDateFilter("upcoming");
      return;
    }
    if (shortcut === "past") {
      setEventDateFilter("past");
      return;
    }
    setEventQuickFilter(shortcut);
  }

  async function handleCreateEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setLoading(true);
    setEventMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: eventTitle.trim(),
          slug: normalizeSlug(eventSlug),
          event_date: eventDate || null,
          event_time: eventTime || null,
          location: eventLocation.trim() || null,
          status: eventStatus,
          materials: {
            covers: selectedCover ? [selectedCover] : [],
            selected_cover: selectedCover,
            frame_horizontal: null,
            frame_vertical: null,
            frame_color: "#ffffff",
            frame_thickness: frameThickness,
            logo_asset: null,
            qr_logo: null,
            logo_placement: { x: 0, y: 0, size: 100 },
            distribution_mode: eventDistributionMode,
            sales_pricing: null
          }
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "Etkinlik oluşturulamadı.");
      }

      const created = payload.event as EventItem;
      const nextEvents = [created, ...events];
      setEvents(nextEvents);
      resetListFilters();
      setIsCreatingEvent(false);
      setSelectedEventId(created.id);
      setEventTitle(created.title);
      setEventSlug(created.slug);
      setEventDate(created.event_date ?? "");
      setEventTime(created.event_time ?? "");
      setEventLocation(created.location ?? "");
      setEventStatus(created.status ?? "draft");
      setEventDistributionMode(
        created.materials?.distribution_mode === "free" ? "free" : "paid"
      );
      setEventMessage("Etkinlik oluşturuldu.");
    } catch (error) {
      setEventMessage(
        error instanceof Error ? error.message : "Etkinlik oluşturulamadı."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEvent(eventToDelete?: EventItem) {
    const targetEvent = eventToDelete ?? selectedEvent;
    if (!token || !targetEvent) {
      return;
    }

    const confirmed = window.confirm(
      `"${targetEvent.title}" etkinliğini ve yüklenen tüm fotoğraf kayıtlarını silmek istiyor musun?`
    );
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setEventMessage(null);
    setUploadMessage(null);
    setShareMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/events/${targetEvent.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const payload = (await response.json()) as { detail?: string };
        throw new Error(payload.detail ?? "Etkinlik silinemedi.");
      }

      const nextEvents = events.filter((item) => item.id !== targetEvent.id);
      setEvents(nextEvents);
      if (selectedEventId === targetEvent.id && nextEvents[0]) {
        setSelectedEventId(nextEvents[0].id);
      } else if (selectedEventId === targetEvent.id) {
        startCreatingEvent();
      }
      setOpenEventMenuId(null);
      setPhotos([]);
      setEventMessage(`"${targetEvent.title}" etkinliği silindi.`);
    } catch (error) {
      setEventMessage(
        error instanceof Error ? error.message : "Etkinlik silinemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedEvent) {
      return;
    }

    setLoading(true);
    setEventMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(buildSelectedEventPayload(true))
      });
      const payload = (await response.json()) as {
        detail?: string;
        event?: EventItem;
      };
      if (!response.ok || !payload.event) {
        throw new Error(payload.detail ?? "Etkinlik güncellenemedi.");
      }

      const updated = payload.event;
      setEvents((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setEventTitle(updated.title);
      setEventSlug(updated.slug);
      setEventDate(updated.event_date ?? "");
      setEventTime(updated.event_time ?? "");
      setEventLocation(updated.location ?? "");
      setEventStatus(updated.status ?? "draft");
      setEventMessage(`"${updated.title}" etkinliği güncellendi.`);
    } catch (error) {
      setEventMessage(
        error instanceof Error ? error.message : "Etkinlik güncellenemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateEventPhotographers(nextValue: Record<string, EventPhotographerRow[]>) {
    setEventPhotographers(nextValue);
  }

  function buildAssignedPhotographerPayload(
    rows?: EventPhotographerRow[]
  ): Array<{ id?: string; name: string; email: string; password?: string }> {
    return (rows ?? (selectedEventId ? eventPhotographers[selectedEventId] ?? [] : []))
      .filter((photographer) => photographer.name.trim() && photographer.email.trim())
      .map((photographer) => ({
        ...(typeof photographer.id === "string" ? { id: photographer.id } : {}),
        name: photographer.name.trim(),
        email: photographer.email.trim(),
        ...(photographer.password.trim() ? { password: photographer.password.trim() } : {})
      }));
  }

  function buildSelectedEventPayload(
    includeMaterials = false,
    photographerRows?: EventPhotographerRow[]
  ) {
    return {
      title: eventTitle.trim(),
      slug: normalizeSlug(eventSlug),
      event_date: eventDate || null,
      event_time: eventTime || null,
      location: eventLocation.trim() || null,
      status: eventStatus,
      assigned_photographers: buildAssignedPhotographerPayload(photographerRows),
      ...(includeMaterials
        ? {
            materials: {
              covers: coverImages,
              selected_cover: selectedCover,
              frame_horizontal: selectedEvent?.materials?.frame_horizontal ?? null,
              frame_vertical: selectedEvent?.materials?.frame_vertical ?? null,
              frame_color: frameColor,
              frame_thickness: frameThickness,
              logo_asset: logoAsset,
              qr_logo: qrLogo,
              logo_placement: logoPlacement,
              distribution_mode: eventDistributionMode,
              sales_pricing: selectedEvent?.materials?.sales_pricing ?? null
            }
          }
        : {})
    };
  }

  function addEventPhotographer() {
    if (!selectedEventId) {
      return;
    }

    const nextRow: EventPhotographerRow = {
      id: Date.now(),
      name: "",
      email: "",
      password: "",
      saved: false
    };
    const nextValue = {
      ...eventPhotographers,
      [selectedEventId]: [...(eventPhotographers[selectedEventId] ?? []), nextRow]
    };
    updateEventPhotographers(nextValue);
  }

  function updateEventPhotographer(
    photographerId: number | string,
    field: keyof Omit<EventPhotographerRow, "id">,
    value: string
  ) {
    if (!selectedEventId) {
      return;
    }

    const nextValue = {
      ...eventPhotographers,
      [selectedEventId]: (eventPhotographers[selectedEventId] ?? []).map((item) =>
        item.id === photographerId ? { ...item, [field]: value, saved: false } : item
      )
    };
    updateEventPhotographers(nextValue);
  }

  async function persistEventPhotographers(
    nextRows: EventPhotographerRow[],
    successMessage: string
  ) {
    if (!token || !selectedEvent) {
      return;
    }

    setLoading(true);
    setEventMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(buildSelectedEventPayload(true, nextRows))
      });
      const payload = (await response.json()) as {
        detail?: string;
        event?: EventItem;
      };
      if (!response.ok || !payload.event) {
        throw new Error(payload.detail ?? "Gorevli fotografcilar kaydedilemedi.");
      }
      const updatedEvent = payload.event;

      setEvents((current) =>
        current.map((item) => (item.id === updatedEvent.id ? updatedEvent : item))
      );
      setEventPhotographers((current) => ({
        ...current,
        [updatedEvent.id]: (updatedEvent.assigned_photographers ?? nextRows).map(
          (photographer) => ({
            id: photographer.id,
            name: photographer.name,
            email: photographer.email,
            password: photographer.password ?? "",
            saved: true
          })
        )
      }));
      setEventMessage(successMessage);
    } catch (error) {
      setEventMessage(
        error instanceof Error ? error.message : "Gorevli fotografcilar kaydedilemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveEventPhotographer(photographerId: number | string) {
    if (!selectedEventId) {
      return;
    }

    const targetPhotographer = (eventPhotographers[selectedEventId] ?? []).find(
      (item) => item.id === photographerId
    );
    if (!targetPhotographer) {
      return;
    }

    const nextName = targetPhotographer.name.trim();
    const nextEmail = targetPhotographer.email.trim();
    if (!nextName || !nextEmail) {
      setEventMessage("Görevli fotoğrafçı için ad ve e-posta gir.");
      return;
    }
    if (!targetPhotographer.saved && !targetPhotographer.password.trim()) {
      setEventMessage("Yeni görevli fotoğrafçı için bir şifre gir.");
      return;
    }

    const nextRows = (eventPhotographers[selectedEventId] ?? []).map((item) =>
      item.id === photographerId
        ? {
            ...item,
            name: nextName,
            email: nextEmail,
            saved: true
          }
        : item
    );
    updateEventPhotographers({
      ...eventPhotographers,
      [selectedEventId]: nextRows
    });
    await persistEventPhotographers(
      nextRows,
      `"${nextName}" görevli fotoğrafçılar listesine kaydedildi. Davet bilgilerini kopyalayabilirsin.`
    );
  }

  async function removeEventPhotographer(photographerId: number | string) {
    if (!selectedEventId) {
      return;
    }

    const targetPhotographer = (eventPhotographers[selectedEventId] ?? []).find(
      (item) => item.id === photographerId
    );
    const nextRows = (eventPhotographers[selectedEventId] ?? []).filter(
      (item) => item.id !== photographerId
    );
    updateEventPhotographers({
      ...eventPhotographers,
      [selectedEventId]: nextRows
    });

    if (targetPhotographer?.saved) {
      await persistEventPhotographers(
        nextRows,
        `"${targetPhotographer.name || "Fotografci"}" görevli listesinden çıkarıldı.`
      );
    }
  }

  async function saveEventLocation() {
    if (!token || !selectedEvent) {
      return;
    }

    setLoading(true);
    setEventMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(buildSelectedEventPayload(true))
      });
      const payload = (await response.json()) as {
        detail?: string;
        event?: EventItem;
      };
      if (!response.ok || !payload.event) {
        throw new Error(payload.detail ?? "Etkinlik konumu güncellenemedi.");
      }

      const updated = payload.event;
      setEvents((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setEventLocation(updated.location ?? "");
      setEventMessage("Etkinlik konumu güncellendi.");
    } catch (error) {
      setEventMessage(
        error instanceof Error ? error.message : "Etkinlik konumu güncellenemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function pickSingleMaterialImage(
    files: FileList | null,
    setter: (value: string | null) => void
  ) {
    if (!files || files.length === 0) {
      return;
    }
    setter(await readFileAsDataUrl(files[0] as File));
  }

  async function handlePickCoverImage(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const nextCover = await readFileAsDataUrl(files[0] as File);
    setCoverImages([nextCover]);
    setSelectedCover(nextCover);
  }

  async function saveEventMaterials() {
    if (!token || !selectedEvent) {
      return;
    }

    setLoading(true);
    setMaterialSaveNotice(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...buildSelectedEventPayload(true)
        })
      });
      const payload = (await response.json()) as { detail?: string; event?: EventItem };
      if (!response.ok || !payload.event) {
        throw new Error(payload.detail ?? "Tanitim materyalleri kaydedilemedi.");
      }

      setEvents((current) =>
        current.map((item) => (item.id === payload.event?.id ? payload.event : item))
      );
      setMaterialSaveNotice({
        type: "success",
        text: "Tanitim materyalleri basariyla kaydedildi."
      });
    } catch (error) {
      setMaterialSaveNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Tanitim materyalleri kaydedilemedi."
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedEventId || !uploadFiles?.length) {
      setUploadMessage("Bir etkinlik ve en az bir fotoğraf seç.");
      return;
    }

    setLoading(true);
    setUploadMessage(null);
    const files = Array.from(uploadFiles);
    setUploadQueue(
      files.map((file) => ({
        fileName: file.name,
        progress: 0,
        status: "pending"
      }))
    );
    setUploadOverallProgress(0);
    setShowUploadQueueDetails(true);

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        updateQueueItem(file.name, (item) => ({
          ...item,
          status: "uploading"
        }));
        await uploadPhotoWithProgress(file, selectedEventId, token);
        updateQueueItem(file.name, (item) => ({
          ...item,
          status: "processing"
        }));
        setUploadOverallProgress(Math.round(((index + 1) / files.length) * 100));
      }

      await loadPhotos(token, selectedEventId);
      setUploadFiles(null);
      setUploadQueue((current) =>
        current.map((item) => ({
          ...item,
          status: item.status === "error" ? "error" : "done",
          progress: item.status === "error" ? item.progress : 100
        }))
      );
      setShowUploadQueueDetails(false);
      setUploadMessage("Fotoğraflar yüklendi ve indekslendi.");
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : "Yükleme beklenmedik şekilde başarısız oldu."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedEvent = events.find((item) => item.id === selectedEventId) ?? null;
  const selectedEventSlug = selectedEvent?.slug ?? "";
  const guestPath = getGuestPath(selectedEvent);
  const shareOrigin = appOrigin ? resolveShareOrigin(appOrigin) : "";
  const guestUrl = selectedEvent && shareOrigin ? `${shareOrigin}${guestPath}` : "";
  const qrPreviewUrl = guestUrl
    ? buildQrCodeUrl(guestUrl, selectedEvent?.materials?.qr_logo ?? qrLogo)
    : "";
  const photographerInviteBaseUrl =
    selectedEvent && shareOrigin ? `${shareOrigin}/photographer/login` : "";
  const totalFaces = photos.reduce((sum, photo) => sum + photo.faces_detected, 0);
  const selectedFileNames = uploadFiles ? Array.from(uploadFiles).map((file) => file.name) : [];
  const activeUploadCount = uploadQueue.filter((item) => item.status !== "done").length;
  const uploadDoneCount = uploadQueue.filter((item) => item.status === "done").length;
  const uploadErrorCount = uploadQueue.filter((item) => item.status === "error").length;
  const uploadFinishedCount = uploadDoneCount + uploadErrorCount;
  const uploadFinished = uploadQueue.length > 0 && uploadFinishedCount === uploadQueue.length;
  const uploadCompletedWithoutErrors = uploadFinished && uploadErrorCount === 0;
  const shouldShowUploadQueueDetails =
    uploadQueue.length > 0 &&
    (!uploadFinished || uploadErrorCount > 0 || showUploadQueueDetails);
  const selectedEventCover = getEventCoverImage(selectedEvent);
  const selectedEventPhotographers = selectedEventId
    ? eventPhotographers[selectedEventId] ?? []
    : [];
  const selectedEventMapQuery = [selectedEvent?.title, eventLocation || selectedEvent?.location]
    .filter(Boolean)
    .join(", ");
  const selectedEventMapUrl = selectedEventMapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(selectedEventMapQuery)}&z=15&output=embed`
    : null;
  const selectedEventAccess = getEventAccessConfig(selectedEvent?.status);
  const formStatusAccess = getEventAccessConfig(eventStatus);
  const selectedEventCode = selectedEventSlug.replace(/[^a-z0-9]/gi, "").slice(0, 6) || "event";
  const selectedEventMaterialReadyCount = selectedEvent
    ? [
        selectedCover ?? selectedEventCover,
        frameColor,
        logoAsset,
        qrLogo
      ].filter(Boolean).length
    : 0;
  const selectedEventMaterialRows = [
    [("Kapak" as const), selectedCover ?? selectedEventCover ? "Hazir" : "Eksik"],
    [("Cerceve stili" as const), frameColor ? "Hazir" : "Kapali"],
    [("Logo" as const), logoAsset ? "Hazir" : "Eksik"],
    [("QR kimligi" as const), qrLogo ? "Hazir" : "Varsayilan"]
  ];
  const normalizedFrameThickness = Math.max(20, Math.min(48, Math.round(frameThickness || 32)));
  const previewFrameEdge = Math.max(4, Math.min(10, Math.round(normalizedFrameThickness * 0.16)));
  const previewLogoBand = Math.max(
    28,
    Math.min(44, Math.round(logoPlacement.size * 0.22 + previewFrameEdge * 2))
  );
  const previewLogoHeight = Math.max(16, Math.min(30, previewLogoBand - 10));
  const selectedEventUserMetrics = [
    {
      title: "iOS / Android Kullanici Dagilimi",
      items: [
        ["iOS", "0"],
        ["Android", "0"],
        ["Digerleri", "0"]
      ]
    },
    {
      title: "Erkek / Kadin Kullanici Dagilimi",
      items: [
        ["Erkek", "0"],
        ["Kadin", "0"],
        ["Digerleri", "0"]
      ]
    },
    {
      title: "Ortalama Yas",
      items: [
        ["18-24", "0"],
        ["25-40", "0"],
        ["41+", "0"]
      ]
    }
  ] as const;
  const selectedEventMetricColumns = [
    [
      ["Bulunan Yuz Sayisi", `${totalFaces}`],
      ["Etiketlenen Fotograflar", `${photos.length}`],
      ["Kadin Kullanici Sayisi", "0"],
      ["Erkek Kullanici Sayisi", "0"],
      ["iOS Kullanici Sayisi", "0"],
      ["Android Kullanici Sayisi", "0"]
    ],
    [
      ["Fuayede Gonderilen Toplam Mesaj", "0"],
      ["Fuayedeki Toplam Kullanici Sayisi", "0"],
      ["Fotografi Olmayan Kullanici", "0"],
      ["Ziyaretciler Tarafindan Yuklenen Toplam Fotograf", "0"],
      ["Misafirler Tarafindan Yuklenen Toplam Video", "0"],
      ["Toplam Etkinlik Sahibi Sayisi", "1"]
    ]
  ] as const;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { searchFilteredItems: searchFilteredEvents, visibleItems: filteredEvents } =
    filterEventsByControls(events, {
      searchQuery: eventSearchQuery,
      dateFilter: eventDateFilter,
      quickFilter: eventQuickFilter,
      statusFilter: eventStatusFilter,
      sortValue: eventSort,
      today
    });
  const eventFilterCounts = {
    all: searchFilteredEvents.length,
    draft: searchFilteredEvents.filter((event) => event.status === "draft").length,
    published: searchFilteredEvents.filter((event) => event.status === "published").length,
    completed: searchFilteredEvents.filter((event) => event.status === "completed").length
  };
  const photoGalleryCounts = {
    all: photos.length,
    with_faces: photos.filter((photo) => photo.faces_detected > 0).length,
    processing: photos.filter((photo) => photo.processing_status !== "done").length,
    ready: photos.filter((photo) => photo.processing_status === "done").length
  };
  const filteredPhotos = photos.filter((photo) => {
    if (photoGalleryFilter === "with_faces") {
      return photo.faces_detected > 0;
    }
    if (photoGalleryFilter === "processing") {
      return photo.processing_status !== "done";
    }
    if (photoGalleryFilter === "ready") {
      return photo.processing_status === "done";
    }
    return true;
  });
  const selectedVisiblePhotoCount = filteredPhotos.filter((photo) => selectedPhotoIds.has(photo.id)).length;
  function togglePhotoSelection(photoId: string) {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }

  useEffect(() => {
    setSelectedPhotoIds((current) => {
      if (current.size === 0) {
        return current;
      }

      const availablePhotoIds = new Set(photos.map((photo) => photo.id));
      const next = new Set<string>();
      current.forEach((photoId) => {
        if (availablePhotoIds.has(photoId)) {
          next.add(photoId);
        }
      });

      return next.size === current.size ? current : next;
    });
  }, [photos, selectedEventId]);

  function toggleSelectAll() {
    if (selectedPhotoIds.size === filteredPhotos.length && filteredPhotos.length > 0) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(filteredPhotos.map((p) => p.id)));
    }
  }

  async function bulkDeleteSelectedPhotos() {
    if (selectedPhotoIds.size === 0) return;
    if (!confirm(`${selectedPhotoIds.size} fotoğrafı silmek istediğinize emin misiniz?`)) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/photos/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photo_ids: Array.from(selectedPhotoIds) })
      });
      const payload = (await res.json().catch(() => null)) as
        | { deleted?: string[]; detail?: string }
        | null;
      if (!res.ok) {
        throw new Error(payload?.detail ?? "Fotoğraflar silinemedi.");
      }
      const deletedIds = new Set(payload?.deleted ?? []);
      setPhotos((prev) => prev.filter((p) => !deletedIds.has(p.id)));
      setSelectedPhotoIds(new Set());
      setEventMessage(`${deletedIds.size} fotoğraf silindi.`);
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function bulkReindexSelectedPhotos() {
    if (selectedPhotoIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const results = await Promise.all(
        Array.from(selectedPhotoIds).map(async (photoId) => {
          const response = await fetch(`${apiBaseUrl}/api/photos/${photoId}/index`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          const payload = (await response.json().catch(() => null)) as
            | { detail?: string }
            | null;
          if (!response.ok) {
            throw new Error(payload?.detail ?? `Fotoğraf ${photoId} indekslenemedi.`);
          }
          return photoId;
        })
      );
      if (selectedEventId) {
        const res = await fetch(`${apiBaseUrl}/api/photos/event/${selectedEventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPhotos(data.items ?? []);
        }
      }
      setSelectedPhotoIds(new Set());
      setEventMessage(`${results.length} fotoğraf yeniden indekslendi.`);
    } catch (error) {
      setEventMessage(error instanceof Error ? error.message : "Fotoğraflar yeniden indekslenemedi.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  const derivedTotalPhotos = events.reduce((sum, event) => sum + (event.photo_count ?? 0), 0);
  const derivedCoverReadyCount = events.filter((event) => !!getEventCoverImage(event)).length;
  const overview = {
    total_events: summary?.total_events ?? events.length,
    total_photos: summary?.total_photos ?? derivedTotalPhotos,
    total_faces: summary?.total_faces ?? 0,
    cover_ready_events: summary?.cover_ready_events ?? derivedCoverReadyCount,
    media_ready_events:
      summary?.media_ready_events ??
      events.filter((event) => (event.photo_count ?? 0) > 0).length,
    upcoming_events: summary?.upcoming_events ?? 0,
    past_events: summary?.past_events ?? 0,
    draft_events:
      summary?.draft_events ?? events.filter((event) => event.status === "draft").length,
    photographer_count: summary?.photographer_count ?? 0
  };
  const overviewShortcutState = {
    all:
      eventStatusFilter === "all" &&
      eventDateFilter === "all" &&
      eventQuickFilter === "all" &&
      eventSearchQuery === "" &&
      eventSort === "recent",
    draft:
      eventStatusFilter === "draft" &&
      eventDateFilter === "all" &&
      eventQuickFilter === "all" &&
      eventSearchQuery === "",
    upcoming:
      eventStatusFilter === "all" &&
      eventDateFilter === "upcoming" &&
      eventQuickFilter === "all" &&
      eventSearchQuery === "",
    past:
      eventStatusFilter === "all" &&
      eventDateFilter === "past" &&
      eventQuickFilter === "all" &&
      eventSearchQuery === "",
    media_ready:
      eventStatusFilter === "all" &&
      eventDateFilter === "all" &&
      eventQuickFilter === "media_ready" &&
      eventSearchQuery === "",
    cover_ready:
      eventStatusFilter === "all" &&
      eventDateFilter === "all" &&
      eventQuickFilter === "cover_ready" &&
      eventSearchQuery === ""
  };
  const activeFilterChips = [
    eventStatusFilter !== "all"
      ? {
          key: "status",
          label: `Durum: ${getOptionLabel(EVENT_FILTER_OPTIONS, eventStatusFilter)}`,
          onRemove: () => setEventStatusFilter("all")
        }
      : null,
    eventDateFilter !== "all"
      ? {
          key: "date",
          label: `Tarih: ${getOptionLabel(EVENT_DATE_FILTER_OPTIONS, eventDateFilter)}`,
          onRemove: () => setEventDateFilter("all")
        }
      : null,
    eventQuickFilter !== "all"
      ? {
          key: "quick",
          label: `Icerik: ${getOptionLabel(EVENT_QUICK_FILTER_OPTIONS, eventQuickFilter)}`,
          onRemove: () => setEventQuickFilter("all")
        }
      : null,
    eventSearchQuery.trim()
      ? {
          key: "search",
          label: `Arama: ${eventSearchQuery.trim()}`,
          onRemove: () => setEventSearchQuery("")
        }
      : null,
    eventSort !== "recent"
      ? {
          key: "sort",
          label: `Siralama: ${getOptionLabel(EVENT_SORT_OPTIONS, eventSort)}`,
          onRemove: () => setEventSort("recent")
        }
      : null
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    onRemove: () => void;
  }>;
  const hasActiveListFilters = activeFilterChips.length > 0;
  const activePresetId =
    eventSearchQuery.trim() === ""
      ? (EVENT_VIEW_PRESETS.find(
          (preset) =>
            preset.filters.status === eventStatusFilter &&
            preset.filters.date === eventDateFilter &&
            preset.filters.quick === eventQuickFilter &&
            preset.filters.sort === eventSort
        )?.id ?? null)
      : null;
  const activeSavedViewId =
    savedViews.find(
      (view) =>
        view.filters.status === eventStatusFilter &&
        view.filters.date === eventDateFilter &&
        view.filters.quick === eventQuickFilter &&
        view.filters.searchQuery === eventSearchQuery.trim() &&
        view.filters.sort === eventSort
    )?.id ?? null;
  const activeSharedSavedViewId =
    sharedSavedViews.find(
      (view) =>
        view.filters.status === eventStatusFilter &&
        view.filters.date === eventDateFilter &&
        view.filters.quick === eventQuickFilter &&
        view.filters.searchQuery === eventSearchQuery.trim() &&
        view.filters.sort === eventSort
    )?.id ?? null;
  const suggestedSavedViewTemplates = savedViewTemplates.filter((template) => {
    const matchesRole =
      user?.role === "admin"
        ? true
        : template.targetRole === "all" || template.targetRole === user?.role;
    const matchesStatus =
      user?.role === "admin"
        ? templateStatusFilter === "all" || template.status === templateStatusFilter
        : template.status === "published";
    return matchesRole && matchesStatus;
  });
  const templateStatusCounts = {
    all: savedViewTemplates.length,
    draft: savedViewTemplates.filter((template) => template.status === "draft").length,
    published: savedViewTemplates.filter((template) => template.status === "published").length
  };
  const sharedSavedViewCategories = Array.from(
    new Set(
      sharedSavedViews
        .map((view) => normalizeSavedViewCategory(view.category))
        .filter((item): item is string => !!item)
    )
  ).sort((left, right) => left.localeCompare(right, "tr"));
  const filteredSharedSavedViews = sharedSavedViews
    .filter((view) => {
      const normalizedQuery = normalizeSearchValue(sharedSavedViewSearchQuery);
      const categoryMatches =
        sharedSavedViewCategoryFilter === "all" ||
        normalizeSavedViewCategory(view.category) === sharedSavedViewCategoryFilter;
      if (!categoryMatches) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const sharedSearchStack = [
        view.label,
        view.category,
        view.ownerName,
        view.ownerEmail,
        getOptionLabel(EVENT_FILTER_OPTIONS, view.filters.status),
        getOptionLabel(EVENT_DATE_FILTER_OPTIONS, view.filters.date),
        getOptionLabel(EVENT_QUICK_FILTER_OPTIONS, view.filters.quick)
      ]
        .map((item) => normalizeSearchValue(item))
        .join(" ");

      return sharedSearchStack.includes(normalizedQuery);
    })
    .sort((left, right) => {
      const leftFavorite = favoriteSharedSavedViewIds.includes(left.id);
      const rightFavorite = favoriteSharedSavedViewIds.includes(right.id);
      if (leftFavorite !== rightFavorite) {
        return leftFavorite ? -1 : 1;
      }

      const leftUsage = sharedSavedViewUsageMap[left.id];
      const rightUsage = sharedSavedViewUsageMap[right.id];
      const leftUsageScore = (leftUsage?.copyCount ?? 0) * 2 + (leftUsage?.applyCount ?? 0);
      const rightUsageScore = (rightUsage?.copyCount ?? 0) * 2 + (rightUsage?.applyCount ?? 0);
      if (leftUsageScore !== rightUsageScore) {
        return rightUsageScore - leftUsageScore;
      }

      const leftLastUsed = leftUsage?.lastUsedAt ? Date.parse(leftUsage.lastUsedAt) : 0;
      const rightLastUsed = rightUsage?.lastUsedAt ? Date.parse(rightUsage.lastUsedAt) : 0;
      if (leftLastUsed !== rightLastUsed) {
        return rightLastUsed - leftLastUsed;
      }

      return left.label.localeCompare(right.label, "tr");
    });

  if (!sidebarStateReady) {
    return (
      <section className="admin-grid">
        <div className="panel">
          <div className="eyebrow">Panel</div>
          <h2 className="section-title">Yukleniyor</h2>
          <p className="muted">Oturum kontrol ediliyor...</p>
        </div>
      </section>
    );
  }

  if (!token) {
    return (
      <section className="admin-grid">
        <div className="panel">
          <div className="eyebrow">Panel Girişi</div>
          <h2 className="section-title">Fotoğrafçı erişimi</h2>
          <p className="muted">
            Etkinlik oluşturmak, fotoğraf yüklemek ve misafir galerisi akışını
            yönetmek için giriş yap.
          </p>
          <form className="admin-form" onSubmit={handleLogin}>
            <label className="field">
              <span>E-posta</span>
              <input
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>
            <label className="field">
              <span>Şifre</span>
              <input
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            <button className="button" disabled={loading} type="submit">
              {loading ? "Giriş yapılıyor..." : "Panele Gir"}
            </button>
          </form>
          {authMessage ? <div className="status">{authMessage}</div> : null}
        </div>

        <div className="panel">
          <div className="eyebrow">Panel Özeti</div>
          <div className="admin-checklist">
            <div className="check-card">
              <strong>Etkinlik oluştur</strong>
              <p className="muted">
                Başlık, tarih, konum ve misafir linkini tanımla.
              </p>
            </div>
            <div className="check-card">
              <strong>Fotoğrafları yükle</strong>
              <p className="muted">
                Her yükleme otomatik indekslenir, aramaya hazır olur.
              </p>
            </div>
            <div className="check-card">
              <strong>QR akışını paylaş</strong>
              <p className="muted">
                Katılımcılar selfie ile fotoğraflarını bulabilsin.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="admin-grid">
        <div className="panel">
          <div className="eyebrow">Admin</div>
          <h2 className="section-title">Panel Hazirlaniyor</h2>
          <p className="muted">Giris yapildi. Etkinlikler ve panel verileri yukleniyor...</p>
          {authMessage ? <div className="status">{authMessage}</div> : null}
        </div>
      </section>
    );
  }

  // Empty mode: yeni kullanıcı için boş panel
  if (isEmptyMode && token && user) {
    return (
      <section className="admin-grid">
        <div className="panel" style={{ padding: "40px", textAlign: "center" }}>
          <div className="eyebrow">Hoş Geldin!</div>
          <h2 className="section-title" style={{ marginTop: "20px" }}>
            {user.full_name ?? user.email}
          </h2>
          <p className="muted" style={{ marginTop: "10px", marginBottom: "30px" }}>
            Profilin tamamen oluşturuldu. Şimdi başlamaya hazırsın!
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              className="button"
              onClick={() => router.push("/admin")}
              type="button"
            >
              Admin Paneline Git
            </button>
            <button
              className="button-secondary"
              onClick={logout}
              type="button"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-grid">
      <div className="panel admin-sidebar">
        <div className="eyebrow">{getUserRoleLabel(user.role)}</div>
        <h2 className="section-title">Tekrar hoş geldin</h2>
        <p className="muted">
          {user.full_name ?? user.email}
          <br />
          Rol: {getUserRoleLabel(user.role)}
        </p>
        <div className="cta-row">
          <button className="button-secondary" onClick={logout} type="button">
            Çıkış Yap
          </button>
          {selectedEvent ? (
            <a className="button" href={guestPath} target="_blank">
              {getGuestLinkLabel(selectedEvent)}
            </a>
          ) : null}
        </div>

        <div className="admin-event-rail">
          <div className="event-list-head event-list-head-simple">
            <div className="event-list-head-top">
              <div>
                <strong>Etkinlikler</strong>
                <span>
                  {filteredEvents.length}/{events.length} gorunuyor
                </span>
              </div>
              <button
                className="button"
                onClick={() => {
                  setAdminMainPanel("settings");
                  setAdminSidebarPanel("event");
                  startCreatingEvent();
                }}
                type="button"
              >
                + Yeni Etkinlik
              </button>
            </div>
            {hasActiveListFilters ? (
              <div className="event-list-head-note">
                Filtreli liste gorunuyor. Detaylari ayarlar ekranindan yonetebilirsin.
              </div>
            ) : null}
          </div>

          <div className="event-list">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <article
                  className={`event-card${event.id === selectedEventId ? " event-card-active" : ""}`}
                  key={event.id}
                >
                  <div className="event-card-top">
                    <button
                      className="event-card-main"
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setAdminMainPanel("studio");
                        setOpenEventMenuId(null);
                      }}
                      type="button"
                    >
                      <div className="event-card-main-row">
                        <div
                          aria-hidden="true"
                          className={[
                            "event-thumb",
                            getEventCoverImage(event) ? "event-thumb-has-image" : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={
                            getEventCoverImage(event)
                              ? { backgroundImage: `url(${getEventCoverImage(event)})` }
                              : undefined
                          }
                        />
                        <div className="event-card-copy">
                          <strong>{event.title}</strong>
                          <span className={`event-status-chip event-status-${event.status}`}>
                            {getEventStatusLabel(event.status)}
                          </span>
                          <span>{event.location ?? "Özel Mekan"}</span>
                          <span>{event.photo_count ?? 0} Foto • {formatDateTime(event.event_date, event.event_time)}</span>
                        </div>
                      </div>
                    </button>
                    <div className="event-menu-wrap">
                      <button
                        aria-label={`${event.title} işlemleri`}
                        className="event-menu-button"
                        onClick={() =>
                          setOpenEventMenuId((current) => (current === event.id ? null : event.id))
                        }
                        type="button"
                      >
                        ...
                      </button>
                    </div>
                  </div>
                  {openEventMenuId === event.id ? (
                    <div className="event-card-actions">
                      <button
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setSelectedEventId(event.id);
                          setAdminSidebarPanel("event");
                          setAdminMainPanel("settings");
                          closeEventMenu();
                        }}
                        type="button"
                      >
                        Etkinliği Düzenle
                      </button>
                      <button
                        className="event-card-action-danger"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          closeEventMenu();
                          void handleDeleteEvent(event);
                        }}
                        type="button"
                      >
                        Etkinliği Sil
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="event-list-empty">
                Bu filtrede etkinlik yok. Farkli bir durum sec veya yeni etkinlik olustur.
                <div className="event-list-empty-actions">
                  <button
                    className="button"
                    onClick={() => {
                      setAdminMainPanel("settings");
                      setAdminSidebarPanel("event");
                      startCreatingEvent();
                    }}
                    type="button"
                  >
                    Etkinlik Olustur
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="panel admin-main">
        {adminMainPanel === "settings" ? (
          <>
            <div className="admin-workspace-switcher admin-settings-switcher">
              <button
                className={adminSidebarPanel === "event" ? "admin-workspace-switcher-active" : ""}
                onClick={() => setAdminSidebarPanel("event")}
                type="button"
              >
                Etkinlik
              </button>
              <button
                className={adminSidebarPanel === "list" ? "admin-workspace-switcher-active" : ""}
                onClick={() => setAdminSidebarPanel("list")}
                type="button"
              >
                Liste
              </button>
              <button
                className={adminSidebarPanel === "views" ? "admin-workspace-switcher-active" : ""}
                onClick={() => setAdminSidebarPanel("views")}
                type="button"
              >
                Gorunumler
              </button>
              <button
                className={adminSidebarPanel === "shared" ? "admin-workspace-switcher-active" : ""}
                onClick={() => setAdminSidebarPanel("shared")}
                type="button"
              >
                Ekip
              </button>
            </div>

            {adminSidebarPanel === "list" ? (
              <div className="admin-sections">
                <div className="result-metrics admin-metrics admin-overview-metrics">
                  <button
                    className={`metric-card metric-card-button${
                      overviewShortcutState.all ? " metric-card-button-active" : ""
                    }`}
                    onClick={() => applyOverviewShortcut("all")}
                    type="button"
                  >
                    <span>Toplam etkinlik</span>
                    <strong>{overview.total_events}</strong>
                  </button>
                  <button
                    className={`metric-card metric-card-button${
                      overviewShortcutState.draft ? " metric-card-button-active" : ""
                    }`}
                    onClick={() => applyOverviewShortcut("draft")}
                    type="button"
                  >
                    <span>Taslak</span>
                    <strong>{overview.draft_events}</strong>
                  </button>
                  <button
                    className={`metric-card metric-card-button${
                      overviewShortcutState.media_ready ? " metric-card-button-active" : ""
                    }`}
                    onClick={() => applyOverviewShortcut("media_ready")}
                    type="button"
                  >
                    <span>Toplam fotoğraf</span>
                    <strong>{overview.total_photos}</strong>
                  </button>
                  <button
                    className={`metric-card metric-card-button${
                      overviewShortcutState.media_ready ? " metric-card-button-active" : ""
                    }`}
                    onClick={() => applyOverviewShortcut("media_ready")}
                    type="button"
                  >
                    <span>Toplam yüz</span>
                    <strong>{overview.total_faces}</strong>
                  </button>
                  <button
                    className={`metric-card metric-card-button${
                      overviewShortcutState.upcoming ? " metric-card-button-active" : ""
                    }`}
                    onClick={() => applyOverviewShortcut("upcoming")}
                    type="button"
                  >
                    <span>Yaklaşan etkinlik</span>
                    <strong>{overview.upcoming_events}</strong>
                  </button>
                  <button
                    className={`metric-card metric-card-button${
                      overviewShortcutState.past ? " metric-card-button-active" : ""
                    }`}
                    onClick={() => applyOverviewShortcut("past")}
                    type="button"
                  >
                    <span>Geçmiş etkinlik</span>
                    <strong>{overview.past_events}</strong>
                  </button>
                  <button
                    className={`metric-card metric-card-button${
                      overviewShortcutState.media_ready ? " metric-card-button-active" : ""
                    }`}
                    onClick={() => applyOverviewShortcut("media_ready")}
                    type="button"
                  >
                    <span>Medyası hazır</span>
                    <strong>{overview.media_ready_events}</strong>
                  </button>
                  <button
                    className={`metric-card metric-card-button${
                      overviewShortcutState.cover_ready ? " metric-card-button-active" : ""
                    }`}
                    onClick={() => applyOverviewShortcut("cover_ready")}
                    type="button"
                  >
                    <span>Kapak hazır</span>
                    <strong>{overview.cover_ready_events}</strong>
                  </button>
                  <div className="metric-card metric-card-muted">
                    <span>Fotoğrafçı</span>
                    <strong>{overview.photographer_count}</strong>
                  </div>
                </div>
                <section className="admin-block">
                  <div className="eyebrow">Liste Ayarlari</div>
                  <h3>Sol etkinlik menusu</h3>
                  <p className="muted">
                    Sol tarafta gorunen etkinlikleri filtrele, sirala ve mevcut gorunumu paylas.
                  </p>
                  <div className="editor-actions">
                    <button className="button-secondary" onClick={copyAdminViewLink} type="button">
                      Gorunumu Kopyala
                    </button>
                    <button className="button-secondary" onClick={resetListFilters} type="button">
                      Tum filtreleri temizle
                    </button>
                  </div>
                  <div className="admin-list-settings-grid">
                    <label className="field">
                      <span>Hizli ara</span>
                      <input
                        onChange={(event) => setEventSearchQuery(event.target.value)}
                        placeholder="Baslik, slug, konum veya tarih"
                        value={eventSearchQuery}
                      />
                    </label>
                    <label className="field">
                      <span>Siralama</span>
                      <select
                        onChange={(event) => setEventSort(event.target.value as EventSortValue)}
                        value={eventSort}
                      >
                        {EVENT_SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="admin-list-filter-stack">
                    <div className="admin-list-filter-group">
                      <span className="admin-list-filter-label">Durum</span>
                      <div className="event-filter-row">
                        {EVENT_FILTER_OPTIONS.map((option) => (
                          <button
                            className={`event-filter-button${
                              eventStatusFilter === option.value ? " event-filter-button-active" : ""
                            }`}
                            key={option.value}
                            onClick={() => setEventStatusFilter(option.value)}
                            type="button"
                          >
                            <span>{option.label}</span>
                            <strong>{eventFilterCounts[option.value]}</strong>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="admin-list-filter-group">
                      <span className="admin-list-filter-label">Tarih</span>
                      <div className="event-shared-view-category-row">
                        {EVENT_DATE_FILTER_OPTIONS.map((option) => (
                          <button
                            className={
                              eventDateFilter === option.value
                                ? "event-shared-view-category-active"
                                : ""
                            }
                            key={option.value}
                            onClick={() => setEventDateFilter(option.value)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="admin-list-filter-group">
                      <span className="admin-list-filter-label">Icerik</span>
                      <div className="event-shared-view-category-row">
                        {EVENT_QUICK_FILTER_OPTIONS.map((option) => (
                          <button
                            className={
                              eventQuickFilter === option.value
                                ? "event-shared-view-category-active"
                                : ""
                            }
                            key={option.value}
                            onClick={() => setEventQuickFilter(option.value)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {hasActiveListFilters ? (
                    <div className="event-active-filters">
                      <div className="event-active-filter-list">
                        {activeFilterChips.map((chip) => (
                          <button
                            className="event-active-filter-chip"
                            key={chip.key}
                            onClick={chip.onRemove}
                            type="button"
                          >
                            <span>{chip.label}</span>
                            <strong aria-hidden="true">x</strong>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {viewShareMessage ? <div className="status">{viewShareMessage}</div> : null}
                </section>
              </div>
            ) : null}

            {adminSidebarPanel === "event" ? (
              <div className="admin-sections">
                <section className="admin-block">
                  <div className="eyebrow">
                    {isCreatingEvent || !selectedEvent ? "Etkinlik Oluştur" : "Etkinlik Düzenle"}
                  </div>
                  <h3>
                    {isCreatingEvent || !selectedEvent
                      ? "Yeni bir galeri oluştur"
                      : `${selectedEvent.title} düzenleniyor`}
                  </h3>
                  <p className="muted">
                    {isCreatingEvent || !selectedEvent
                      ? "Önce temel etkinlik bilgilerini kaydet. Sonra fotoğraf yükleyip misafir bağlantısını paylaş."
                      : "Seçili etkinlik bu forma yüklendi. Bilgileri güncelleyip kaydedebilirsin."}
                  </p>
                  <div className="status-guidance-card">
                    <div className="status-guidance-head">
                      <span className={`event-status-chip event-status-${eventStatus}`}>
                        {getEventStatusLabel(eventStatus)}
                      </span>
                      <strong>{formStatusAccess.helperTitle}</strong>
                    </div>
                    <p>{formStatusAccess.helperText}</p>
                  </div>
                  {selectedEvent && !isCreatingEvent ? (
                    <div className="editor-toolbar">
                      <div className="editor-stat">
                        <span>{selectedEventAccess.urlLabel}</span>
                        <strong>{guestPath}</strong>
                      </div>
                      <div className="editor-stat">
                        <span>Yüklü</span>
                        <strong>{photos.length} fotoğraf</strong>
                      </div>
                      <div className="editor-stat">
                        <span>İndekslenen yüz</span>
                        <strong>{totalFaces}</strong>
                      </div>
                      <div className="editor-actions">
                        <button
                          className="button"
                          onClick={() => copyGuestLink(guestUrl, selectedEvent.status)}
                          type="button"
                        >
                          {selectedEventAccess.copyLabel}
                        </button>
                        <a className="button-secondary" href={guestPath} target="_blank">
                          {selectedEventAccess.openLabel}
                        </a>
                        <button
                          className="button-secondary"
                          onClick={downloadQrCode}
                          type="button"
                        >
                          QR İndir
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <form
                    className="admin-form"
                    onSubmit={isCreatingEvent || !selectedEvent ? handleCreateEvent : handleUpdateEvent}
                  >
                    <div className="admin-event-form-grid">
                      <label className="field">
                        <span>Etkinlik başlığı</span>
                        <input
                          onChange={(event) => {
                            const value = event.target.value;
                            setEventTitle(value);
                            if (!eventSlug) {
                              setEventSlug(normalizeSlug(value));
                            }
                          }}
                          placeholder="Ayse Mehmet Dugunu"
                          value={eventTitle}
                        />
                      </label>
                      <label className="field">
                        <span>Slug</span>
                        <input
                          onBlur={(event) => setEventSlug(normalizeSlug(event.target.value))}
                          onChange={(event) => setEventSlug(formatSlugInput(event.target.value))}
                          placeholder="ayse-mehmet-wedding"
                          value={eventSlug}
                        />
                      </label>
                      <label className="field">
                        <span>Tarih</span>
                        <input
                          onChange={(event) => setEventDate(event.target.value)}
                          type="date"
                          value={eventDate}
                        />
                      </label>
                      <label className="field">
                        <span>Saat</span>
                        <input
                          onChange={(event) => setEventTime(event.target.value)}
                          type="time"
                          value={eventTime}
                        />
                      </label>
                      <label className="field">
                        <span>Konum</span>
                        <input
                          onChange={(event) => setEventLocation(event.target.value)}
                          placeholder="Dubai"
                          value={eventLocation}
                        />
                      </label>
                      <label className="field">
                        <span>Durum</span>
                        <select
                          onChange={(event) => setEventStatus(event.target.value)}
                          value={eventStatus}
                        >
                          {EVENT_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field field-span-2">
                        <span>Fotoğraf Servis Modeli</span>
                        <select
                          onChange={(event) =>
                            setEventDistributionMode(event.target.value === "free" ? "free" : "paid")
                          }
                          value={eventDistributionMode}
                        >
                          <option value="free">Ücretsiz dağıtım (misafir tüm fotoğrafları indirir)</option>
                          <option value="paid">Ücretli satış (1 ücretsiz + paket satın alma)</option>
                        </select>
                      </label>
                    </div>

                    <section className="event-banner-quick-card">
                      <div className="event-banner-quick-preview-wrap">
                        <div
                          className={[
                            "event-banner-quick-preview",
                            selectedCover ?? getEventCoverImage(selectedEvent) ? "event-banner-quick-preview-has-image" : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={
                            selectedCover ?? getEventCoverImage(selectedEvent)
                              ? { backgroundImage: `url(${selectedCover ?? getEventCoverImage(selectedEvent)})` }
                              : undefined
                          }
                        >
                          {selectedCover ?? getEventCoverImage(selectedEvent) ? null : "Banner / kapak gorseli yok"}
                        </div>
                        <div className="event-banner-quick-copy">
                          <strong>Etkinlik Banneri</strong>
                          <p className="muted">
                            Misafir sayfasındaki üst görsel alanında kullanılır. Buradan hızlıca ekleyebilirsin.
                          </p>
                        </div>
                      </div>
                      <div className="cta-row">
                        <button
                          className="button-secondary"
                          onClick={() => quickBannerInputRef.current?.click()}
                          type="button"
                        >
                          {selectedCover ?? getEventCoverImage(selectedEvent) ? "Banner Degistir" : "Banner Ekle"}
                        </button>
                        {selectedCover ? (
                          <button
                            className="button-secondary"
                            onClick={() => {
                              setCoverImages([]);
                              setSelectedCover(null);
                            }}
                            type="button"
                          >
                            Kaldir
                          </button>
                        ) : null}
                      </div>
                      <input
                        accept="image/*"
                        onChange={(changeEvent) => void handlePickCoverImage(changeEvent.target.files)}
                        ref={quickBannerInputRef}
                        style={{ display: "none" }}
                        type="file"
                      />
                    </section>
                    <div className="cta-row">
                      <button className="button" disabled={loading} type="submit">
                        {isCreatingEvent || !selectedEvent
                          ? "Etkinliği Oluştur"
                          : "Değişiklikleri Kaydet"}
                      </button>
                      {!isCreatingEvent && selectedEvent ? (
                        <button
                          className="button-secondary"
                          disabled={loading}
                          onClick={() => {
                            setEventTitle(selectedEvent.title);
                            setEventSlug(selectedEvent.slug);
                            setEventDate(selectedEvent.event_date ?? "");
                            setEventTime(selectedEvent.event_time ?? "");
                            setEventLocation(selectedEvent.location ?? "");
                            setEventStatus(selectedEvent.status ?? "draft");
                            setEventDistributionMode(
                              selectedEvent.materials?.distribution_mode === "free"
                                ? "free"
                                : "paid"
                            );
                          }}
                          type="button"
                        >
                          Değişiklikleri Sıfırla
                        </button>
                      ) : null}
                    </div>
                  </form>
                  {eventMessage ? <div className="status">{eventMessage}</div> : null}
                  {shareMessage ? <div className="status">{shareMessage}</div> : null}
                </section>
              </div>
            ) : null}

            {adminSidebarPanel === "views" ? (
              <div className="admin-sections">
                <section className="admin-block">
                  <div className="eyebrow">Gorunumler</div>
                  <h3>Filtreler ve sablonlar</h3>
                  <p className="muted">
                    Kayitli gorunumleri, merkezi sablonlari ve arsivlenmis history kayitlarini tek yerde yonet.
                  </p>

                  <div className="event-preset-section">
                    <div className="event-preset-head">
                      <strong>Hazir Gorunumler</strong>
                      <span>Tek tikla ekip akislari</span>
                    </div>
                    <div className="event-preset-grid">
                      {EVENT_VIEW_PRESETS.map((preset) => (
                        <button
                          className={`event-preset-card${
                            activePresetId === preset.id ? " event-preset-card-active" : ""
                          }`}
                          key={preset.id}
                          onClick={() => applyViewPreset(preset.id)}
                          type="button"
                        >
                          <strong>{preset.label}</strong>
                          <span>{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="event-preset-section">
                    <div className="event-preset-head">
                      <strong>Kayitli Gorunumler</strong>
                      <span>Kendi filtre setlerini sakla</span>
                    </div>
                    {user.role === "admin" ? (
                      <div className="event-template-section">
                        <div className="event-preset-head">
                          <strong>Merkezi Sablon Yonetimi</strong>
                          <span>Mevcut filtrelerle ekip geneli baslangic paketleri olustur</span>
                        </div>
                        <div className="event-saved-view-form">
                          <input
                            onChange={(event) => setTemplateName(event.target.value)}
                            placeholder="Sablon adi"
                            value={templateName}
                          />
                          <input
                            onChange={(event) => setTemplateCategory(event.target.value)}
                            placeholder="Kategori/Paket"
                            value={templateCategory}
                          />
                          <input
                            onChange={(event) => setTemplateDescription(event.target.value)}
                            placeholder="Kisa aciklama"
                            value={templateDescription}
                          />
                          <textarea
                            onChange={(event) => setTemplateChangeNote(event.target.value)}
                            placeholder="Bu surumde ne degisti?"
                            rows={3}
                            value={templateChangeNote}
                          />
                          <label className="event-search-field event-template-role-field">
                            <span>Hedef rol</span>
                            <select
                              onChange={(event) =>
                                setTemplateTargetRole(
                                  normalizeSavedViewTemplateRole(event.target.value)
                                )
                              }
                              value={templateTargetRole}
                            >
                              <option value="photographer">Fotografci</option>
                              <option value="admin">Admin</option>
                              <option value="all">Tum Roller</option>
                            </select>
                          </label>
                          <label className="event-search-field event-template-role-field">
                            <span>Durum</span>
                            <select
                              onChange={(event) =>
                                setTemplateStatus(
                                  normalizeSavedViewTemplateStatus(event.target.value)
                                )
                              }
                              value={templateStatus}
                            >
                              {TEMPLATE_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="event-saved-view-actions">
                            <button
                              className="button-secondary"
                              onClick={saveCurrentFiltersAsTemplate}
                              type="button"
                            >
                              {editingTemplateId ? "Sablonu Guncelle" : "Mevcut Filtreyi Sablonlastir"}
                            </button>
                            {editingTemplateId ? (
                              <button
                                className="button-secondary"
                                onClick={resetTemplateForm}
                                type="button"
                              >
                                Duzenlemeyi Iptal Et
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {suggestedSavedViewTemplates.length > 0 ? (
                      <div className="event-template-section">
                        <div className="event-preset-head">
                          <strong>Merkezi Baslangic Setleri</strong>
                          <span>
                            {user.role === "admin"
                              ? "Tum ekip icin tanimli merkezi sablonlar"
                              : `${user.role} akisi icin merkezi oneriler`}
                          </span>
                        </div>
                        {user.role === "admin" ? (
                          <div className="event-shared-view-category-row">
                            <button
                              className={
                                templateStatusFilter === "all"
                                  ? "event-shared-view-category-active"
                                  : ""
                              }
                              onClick={() => setTemplateStatusFilter("all")}
                              type="button"
                            >
                              Tumu ({templateStatusCounts.all})
                            </button>
                            {TEMPLATE_STATUS_OPTIONS.map((option) => (
                              <button
                                className={
                                  templateStatusFilter === option.value
                                    ? "event-shared-view-category-active"
                                    : ""
                                }
                                key={option.value}
                                onClick={() => setTemplateStatusFilter(option.value)}
                                type="button"
                              >
                                {option.label} ({templateStatusCounts[option.value]})
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <div className="event-template-grid">
                          {suggestedSavedViewTemplates.map((template) => {
                            const restoredFromVersion = getArchivedRestoreVersion(
                              template.changeNote
                            );

                            return (
                              <article
                                className={`event-template-card${
                                  template.status === "published"
                                    ? " event-template-card-published"
                                    : ""
                                }${restoredFromVersion ? " event-template-card-restored" : ""}`}
                                key={template.id}
                              >
                                <div className="event-template-title-row">
                                  <strong>{template.label}</strong>
                                  {restoredFromVersion ? (
                                    <span className="event-template-badge event-template-badge-restored">
                                      Arsivden v{restoredFromVersion} geri yuklendi
                                    </span>
                                  ) : null}
                                </div>
                                <span>
                                  Paket: {template.category}
                                  {" / "}
                                  {template.description}
                                  {template.changeNote ? ` / Not: ${template.changeNote}` : ""}
                                  {user.role === "admin"
                                    ? ` / Rol: ${template.targetRole} / Durum: ${
                                        getOptionLabel(TEMPLATE_STATUS_OPTIONS, template.status)
                                      } / v${template.version}`
                                    : ""}
                                </span>
                                <div className="event-template-meta">
                                  {[
                                    getOptionLabel(EVENT_FILTER_OPTIONS, template.filters.status),
                                    getOptionLabel(EVENT_DATE_FILTER_OPTIONS, template.filters.date),
                                    getOptionLabel(EVENT_QUICK_FILTER_OPTIONS, template.filters.quick)
                                  ].join(" / ")}
                                </div>
                                <div className="event-saved-view-actions">
                                  <button
                                    onClick={() => applySuggestedSavedViewTemplate(template)}
                                    type="button"
                                  >
                                    Forma Tasiyin
                                  </button>
                                  <button
                                    onClick={() => saveSuggestedSavedViewTemplate(template)}
                                    type="button"
                                  >
                                    Hemen Kaydet
                                  </button>
                                  {user.role === "admin" ? (
                                    <button
                                      onClick={() => startEditingTemplate(template.id)}
                                      type="button"
                                    >
                                      Duzenle
                                    </button>
                                  ) : null}
                                  {user.role === "admin" ? (
                                    <button
                                      onClick={() => toggleTemplateHistory(template.id)}
                                      type="button"
                                    >
                                      {openTemplateHistoryId === template.id
                                        ? "Gecmisi Gizle"
                                        : "Gecmisi Gor"}
                                    </button>
                                  ) : null}
                                  {user.role === "admin" && template.status === "draft" ? (
                                    <button
                                      className="event-saved-view-share-active"
                                      onClick={() => updateTemplateStatus(template.id, "published")}
                                      type="button"
                                    >
                                      Yayina Al
                                    </button>
                                  ) : null}
                                  {user.role === "admin" && template.status === "published" ? (
                                    <button
                                      className="event-saved-view-pin-active"
                                      onClick={() => updateTemplateStatus(template.id, "draft")}
                                      type="button"
                                    >
                                      Taslaga Cek
                                    </button>
                                  ) : null}
                                  {user.role === "admin" ? (
                                    <button
                                      className="event-saved-view-delete"
                                      onClick={() => deleteTemplate(template.id)}
                                      type="button"
                                    >
                                      Sil
                                    </button>
                                  ) : null}
                                </div>
                                {user.role === "admin" && openTemplateHistoryId === template.id ? (
                                  <div className="event-template-history">
                                    <strong>Versiyon Gecmisi</strong>
                                    {templateHistoryLoadingId === template.id ? (
                                      <div className="muted">Gecmis yukleniyor...</div>
                                    ) : null}
                                    {templateHistoryById[template.id]?.length ? (
                                      <>
                                        <div className="event-template-history-list">
                                          {templateHistoryById[template.id].map(
                                            (historyItem, historyIndex, historyItems) => {
                                              const previousHistoryItem =
                                                historyItems[historyIndex + 1] ?? null;
                                              const historyDiffSummary =
                                                buildTemplateHistoryDiffSummary(
                                                  historyItem,
                                                  previousHistoryItem
                                                );
                                              const isCompareActive =
                                                templateCompareVersionById[template.id] ===
                                                historyItem.version;
                                              const pairSelection =
                                                templateHistoryPairById[template.id] ?? {
                                                  first: null,
                                                  second: null
                                                };
                                              const isFirstPairSelected =
                                                pairSelection.first === historyItem.version;
                                              const isSecondPairSelected =
                                                pairSelection.second === historyItem.version;
                                              const restoredVersion = getArchivedRestoreVersion(
                                                historyItem.changeNote
                                              );

                                              return (
                                                <article
                                                  className={`event-template-history-item${
                                                    restoredVersion
                                                      ? " event-template-history-item-restored"
                                                      : ""
                                                  }`}
                                                  key={historyItem.id}
                                                >
                                                  <div className="event-template-history-head">
                                                    <div className="event-template-history-title-row">
                                                      <strong>v{historyItem.version}</strong>
                                                      {restoredVersion ? (
                                                        <span className="event-template-badge event-template-badge-restored">
                                                          Arsiv v{restoredVersion} geri yuklendi
                                                        </span>
                                                      ) : null}
                                                    </div>
                                                    <span>
                                                      {getOptionLabel(
                                                        TEMPLATE_STATUS_OPTIONS,
                                                        historyItem.status
                                                      )}{" "}
                                                      / {formatRelativeDateTime(historyItem.createdAt)}
                                                    </span>
                                                  </div>
                                                  <div className="event-template-history-meta">
                                                    {[
                                                      historyItem.category
                                                        ? `Paket: ${historyItem.category}`
                                                        : null,
                                                      `Rol: ${historyItem.targetRole}`,
                                                      getOptionLabel(
                                                        EVENT_FILTER_OPTIONS,
                                                        historyItem.filters.status
                                                      ),
                                                      getOptionLabel(
                                                        EVENT_DATE_FILTER_OPTIONS,
                                                        historyItem.filters.date
                                                      ),
                                                      getOptionLabel(
                                                        EVENT_QUICK_FILTER_OPTIONS,
                                                        historyItem.filters.quick
                                                      )
                                                    ]
                                                      .filter(Boolean)
                                                      .join(" / ")}
                                                  </div>
                                                  {historyItem.changeNote ? (
                                                    <div
                                                      className={`event-template-history-note${
                                                        restoredVersion
                                                          ? " event-template-history-note-restored"
                                                          : ""
                                                      }`}
                                                    >
                                                      Not: {historyItem.changeNote}
                                                    </div>
                                                  ) : null}
                                                  <div className="event-template-history-diff">
                                                    {historyDiffSummary.map((item, diffIndex) => (
                                                      <span
                                                        key={`${historyItem.id}-diff-${diffIndex}`}
                                                      >
                                                        {item}
                                                      </span>
                                                    ))}
                                                  </div>
                                                  <div className="event-saved-view-actions">
                                                    <button
                                                      disabled={
                                                        historyItem.version === template.version
                                                      }
                                                      onClick={() =>
                                                        rollbackTemplateVersion(
                                                          template.id,
                                                          historyItem.version
                                                        )
                                                      }
                                                      type="button"
                                                    >
                                                      {historyItem.version === template.version
                                                        ? "Aktif Surum"
                                                        : "Bu Surume Don"}
                                                    </button>
                                                    {historyItem.version !== template.version ? (
                                                      <button
                                                        className={
                                                          isCompareActive
                                                            ? "event-saved-view-share-active"
                                                            : ""
                                                        }
                                                        onClick={() =>
                                                          toggleTemplateVersionComparison(
                                                            template.id,
                                                            historyItem.version
                                                          )
                                                        }
                                                        type="button"
                                                      >
                                                        {isCompareActive
                                                          ? "Karsilastirmayi Gizle"
                                                          : "Aktif Ile Karsilastir"}
                                                      </button>
                                                    ) : null}
                                                    <button
                                                      className={
                                                        isFirstPairSelected
                                                          ? "event-saved-view-pin-active"
                                                          : ""
                                                      }
                                                      onClick={() =>
                                                        setTemplateHistoryPairVersion(
                                                          template.id,
                                                          "first",
                                                          historyItem.version
                                                        )
                                                      }
                                                      type="button"
                                                    >
                                                      {isFirstPairSelected
                                                        ? "Kars. 1 Secili"
                                                        : "Kars. 1"}
                                                    </button>
                                                    <button
                                                      className={
                                                        isSecondPairSelected
                                                          ? "event-saved-view-share-active"
                                                          : ""
                                                      }
                                                      onClick={() =>
                                                        setTemplateHistoryPairVersion(
                                                          template.id,
                                                          "second",
                                                          historyItem.version
                                                        )
                                                      }
                                                      type="button"
                                                    >
                                                      {isSecondPairSelected
                                                        ? "Kars. 2 Secili"
                                                        : "Kars. 2"}
                                                    </button>
                                                  </div>
                                                </article>
                                              );
                                            }
                                          )}
                                        </div>
                                        {(() => {
                                          const comparedVersion =
                                            templateHistoryById[template.id].find(
                                              (item) =>
                                                item.version ===
                                                templateCompareVersionById[template.id]
                                            ) ?? null;

                                          if (!comparedVersion) {
                                            return null;
                                          }

                                          const comparisonRows = buildTemplateComparisonRows(
                                            toTemplateComparisonSubject(template),
                                            toTemplateComparisonSubject(comparedVersion)
                                          );

                                          return (
                                            <div className="event-template-compare-panel">
                                              <div className="event-template-compare-head">
                                                <div>
                                                  <strong>Detayli Surum Karsilastirma</strong>
                                                  <span>
                                                    Aktif v{template.version} / Secilen v
                                                    {comparedVersion.version}
                                                  </span>
                                                </div>
                                                <button
                                                  className="button-secondary"
                                                  onClick={copyTemplateComparisonLink}
                                                  type="button"
                                                >
                                                  Linki Kopyala
                                                </button>
                                              </div>
                                              <div className="event-template-compare-grid">
                                                {comparisonRows.map((row) => (
                                                  <article
                                                    className={`event-template-compare-row${
                                                      row.changed
                                                        ? " event-template-compare-row-changed"
                                                        : ""
                                                    }`}
                                                    key={row.label}
                                                  >
                                                    <strong>{row.label}</strong>
                                                    <div className="event-template-compare-columns">
                                                      <div>
                                                        <span>Aktif Surum</span>
                                                        <p>{row.currentValue}</p>
                                                      </div>
                                                      <div>
                                                        <span>Secilen Surum</span>
                                                        <p>{row.comparedValue}</p>
                                                      </div>
                                                    </div>
                                                  </article>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                        {(() => {
                                          const pairSelection =
                                            templateHistoryPairById[template.id] ?? {
                                              first: null,
                                              second: null
                                            };
                                          const firstVersion =
                                            templateHistoryById[template.id].find(
                                              (item) => item.version === pairSelection.first
                                            ) ?? null;
                                          const secondVersion =
                                            templateHistoryById[template.id].find(
                                              (item) => item.version === pairSelection.second
                                            ) ?? null;

                                          if (!firstVersion || !secondVersion) {
                                            return null;
                                          }

                                          const comparisonRows = buildTemplateComparisonRows(
                                            toTemplateComparisonSubject(firstVersion),
                                            toTemplateComparisonSubject(secondVersion)
                                          );

                                          return (
                                            <div className="event-template-compare-panel">
                                              <div className="event-template-compare-head">
                                                <div>
                                                  <strong>Surumden Surume Karsilastirma</strong>
                                                  <span>
                                                    Kars. 1 v{firstVersion.version} / Kars. 2 v
                                                    {secondVersion.version}
                                                  </span>
                                                </div>
                                                <button
                                                  className="button-secondary"
                                                  onClick={copyTemplateComparisonLink}
                                                  type="button"
                                                >
                                                  Linki Kopyala
                                                </button>
                                              </div>
                                              <div className="event-template-compare-grid">
                                                {comparisonRows.map((row) => (
                                                  <article
                                                    className={`event-template-compare-row${
                                                      row.changed
                                                        ? " event-template-compare-row-changed"
                                                        : ""
                                                    }`}
                                                    key={`history-${row.label}`}
                                                  >
                                                    <strong>{row.label}</strong>
                                                    <div className="event-template-compare-columns">
                                                      <div>
                                                        <span>Kars. 1</span>
                                                        <p>{row.currentValue}</p>
                                                      </div>
                                                      <div>
                                                        <span>Kars. 2</span>
                                                        <p>{row.comparedValue}</p>
                                                      </div>
                                                    </div>
                                                  </article>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </>
                                    ) : templateHistoryLoadingId === template.id ? null : (
                                      <div className="muted">
                                        Bu sablon icin henuz versiyon gecmisi yok.
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {user.role === "admin" && archivedTemplateItems.length > 0 ? (
                      <div className="event-template-section">
                        <div className="event-preset-head">
                          <strong>Arsivlenmis Sablon Gecmisi</strong>
                          <span>Silinmis sablonlarin history kayitlari burada tutulur</span>
                        </div>
                        <div className="event-template-grid">
                          {archivedTemplateItems.map((archive) => (
                            <article
                              className="event-template-card event-template-card-archived"
                              key={archive.templateId}
                            >
                              <strong>{archive.label}</strong>
                              <span>
                                {[
                                  archive.category ? `Paket: ${archive.category}` : null,
                                  archive.description,
                                  archive.changeNote ? `Son not: ${archive.changeNote}` : null,
                                  `Rol: ${getOptionLabel(
                                    SAVED_VIEW_TEMPLATE_ROLE_OPTIONS,
                                    archive.targetRole
                                  )}`,
                                  `Durum: ${getOptionLabel(
                                    TEMPLATE_STATUS_OPTIONS,
                                    archive.status
                                  )}`,
                                  `v${archive.latestVersion}`,
                                  `${archive.historyCount} surum`,
                                  `Arsiv: ${formatRelativeDateTime(archive.archivedAt)}`
                                ]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </span>
                              <div className="event-saved-view-actions">
                                <button
                                  className="event-saved-view-share-active"
                                  onClick={() => restoreArchivedTemplate(archive.templateId)}
                                  type="button"
                                >
                                  Arsivden Geri Yukle
                                </button>
                                <button
                                  onClick={() => toggleTemplateHistory(archive.templateId)}
                                  type="button"
                                >
                                  {openTemplateHistoryId === archive.templateId
                                    ? "Gecmisi Gizle"
                                    : "Gecmisi Gor"}
                                </button>
                                <button
                                  className="event-saved-view-delete"
                                  onClick={() =>
                                    deleteArchivedTemplateHistory(archive.templateId)
                                  }
                                  type="button"
                                >
                                  Arsivi Temizle
                                </button>
                              </div>
                              {openTemplateHistoryId === archive.templateId ? (
                                <div className="event-template-history">
                                  <strong>Arsiv Versiyon Gecmisi</strong>
                                  {templateHistoryLoadingId === archive.templateId ? (
                                    <div className="muted">Gecmis yukleniyor...</div>
                                  ) : null}
                                  {templateHistoryById[archive.templateId]?.length ? (
                                    <>
                                      <div className="event-template-history-list">
                                        {templateHistoryById[archive.templateId].map(
                                          (historyItem, historyIndex, historyItems) => {
                                            const previousHistoryItem =
                                              historyItems[historyIndex + 1] ?? null;
                                            const historyDiffSummary =
                                              buildTemplateHistoryDiffSummary(
                                                historyItem,
                                                previousHistoryItem
                                              );
                                            const pairSelection =
                                              templateHistoryPairById[archive.templateId] ?? {
                                                first: null,
                                                second: null
                                              };
                                            const isFirstPairSelected =
                                              pairSelection.first === historyItem.version;
                                            const isSecondPairSelected =
                                              pairSelection.second === historyItem.version;

                                            return (
                                              <article
                                                className="event-template-history-item"
                                                key={historyItem.id}
                                              >
                                                <div className="event-template-history-head">
                                                  <strong>v{historyItem.version}</strong>
                                                  <span>
                                                    {getOptionLabel(
                                                      TEMPLATE_STATUS_OPTIONS,
                                                      historyItem.status
                                                    )}{" "}
                                                    /{" "}
                                                    {formatRelativeDateTime(historyItem.createdAt)}
                                                  </span>
                                                </div>
                                                <div className="event-template-history-meta">
                                                  {[
                                                    historyItem.category
                                                      ? `Paket: ${historyItem.category}`
                                                      : null,
                                                    `Rol: ${historyItem.targetRole}`,
                                                    getOptionLabel(
                                                      EVENT_FILTER_OPTIONS,
                                                      historyItem.filters.status
                                                    ),
                                                    getOptionLabel(
                                                      EVENT_DATE_FILTER_OPTIONS,
                                                      historyItem.filters.date
                                                    ),
                                                    getOptionLabel(
                                                      EVENT_QUICK_FILTER_OPTIONS,
                                                      historyItem.filters.quick
                                                    )
                                                  ]
                                                    .filter(Boolean)
                                                    .join(" / ")}
                                                </div>
                                                {historyItem.changeNote ? (
                                                  <div className="event-template-history-note">
                                                    Not: {historyItem.changeNote}
                                                  </div>
                                                ) : null}
                                                <div className="event-template-history-diff">
                                                  {historyDiffSummary.map((item, diffIndex) => (
                                                    <span
                                                      key={`${historyItem.id}-archive-diff-${diffIndex}`}
                                                    >
                                                      {item}
                                                    </span>
                                                  ))}
                                                </div>
                                                <div className="event-saved-view-actions">
                                                  <button
                                                    className={
                                                      isFirstPairSelected
                                                        ? "event-saved-view-pin-active"
                                                        : ""
                                                    }
                                                    onClick={() =>
                                                      setTemplateHistoryPairVersion(
                                                        archive.templateId,
                                                        "first",
                                                        historyItem.version
                                                      )
                                                    }
                                                    type="button"
                                                  >
                                                    {isFirstPairSelected
                                                      ? "Kars. 1 Secili"
                                                      : "Kars. 1"}
                                                  </button>
                                                  <button
                                                    className={
                                                      isSecondPairSelected
                                                        ? "event-saved-view-share-active"
                                                        : ""
                                                    }
                                                    onClick={() =>
                                                      setTemplateHistoryPairVersion(
                                                        archive.templateId,
                                                        "second",
                                                        historyItem.version
                                                      )
                                                    }
                                                    type="button"
                                                  >
                                                    {isSecondPairSelected
                                                      ? "Kars. 2 Secili"
                                                      : "Kars. 2"}
                                                  </button>
                                                  <button
                                                    className="event-saved-view-share-active"
                                                    onClick={() =>
                                                      restoreArchivedTemplate(
                                                        archive.templateId,
                                                        historyItem.version
                                                      )
                                                    }
                                                    type="button"
                                                  >
                                                    Bu Surumu Geri Yukle
                                                  </button>
                                                </div>
                                              </article>
                                            );
                                          }
                                        )}
                                      </div>
                                      {(() => {
                                        const pairSelection =
                                          templateHistoryPairById[archive.templateId] ?? {
                                            first: null,
                                            second: null
                                          };
                                        const firstVersion =
                                          templateHistoryById[archive.templateId].find(
                                            (item) => item.version === pairSelection.first
                                          ) ?? null;
                                        const secondVersion =
                                          templateHistoryById[archive.templateId].find(
                                            (item) => item.version === pairSelection.second
                                          ) ?? null;

                                        if (!firstVersion || !secondVersion) {
                                          return null;
                                        }

                                        const comparisonRows = buildTemplateComparisonRows(
                                          toTemplateComparisonSubject(firstVersion),
                                          toTemplateComparisonSubject(secondVersion)
                                        );

                                        return (
                                          <div className="event-template-compare-panel">
                                            <div className="event-template-compare-head">
                                              <div>
                                                <strong>Arsiv Surum Karsilastirma</strong>
                                                <span>
                                                  Kars. 1 v{firstVersion.version} / Kars. 2 v
                                                  {secondVersion.version}
                                                </span>
                                              </div>
                                              <button
                                                className="button-secondary"
                                                onClick={copyTemplateComparisonLink}
                                                type="button"
                                              >
                                                Linki Kopyala
                                              </button>
                                            </div>
                                            <div className="event-template-compare-grid">
                                              {comparisonRows.map((row) => (
                                                <article
                                                  className={`event-template-compare-row${
                                                    row.changed
                                                      ? " event-template-compare-row-changed"
                                                      : ""
                                                  }`}
                                                  key={`archive-${row.label}`}
                                                >
                                                  <strong>{row.label}</strong>
                                                  <div className="event-template-compare-columns">
                                                    <div>
                                                      <span>Kars. 1</span>
                                                      <p>{row.currentValue}</p>
                                                    </div>
                                                    <div>
                                                      <span>Kars. 2</span>
                                                      <p>{row.comparedValue}</p>
                                                    </div>
                                                  </div>
                                                </article>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </>
                                  ) : templateHistoryLoadingId === archive.templateId ? null : (
                                    <div className="muted">
                                      Bu arsiv icin henuz history kaydi yok.
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="event-saved-view-form">
                      <input
                        onChange={(event) => setSavedViewName(event.target.value)}
                        placeholder="Orn. Yayin oncesi kontrol"
                        value={savedViewName}
                      />
                      <input
                        onChange={(event) => setSavedViewCategory(event.target.value)}
                        placeholder="Paket/Kategori (opsiyonel)"
                        value={savedViewCategory}
                      />
                      <button className="button-secondary" onClick={saveCurrentView} type="button">
                        Gorunumu Kaydet
                      </button>
                    </div>
                    <div className="event-saved-view-utility-row">
                      <button
                        className="button-secondary"
                        onClick={exportSavedViews}
                        type="button"
                      >
                        JSON Disa Aktar
                      </button>
                      <button
                        className="button-secondary"
                        onClick={openSavedViewsImport}
                        type="button"
                      >
                        JSON Ice Aktar
                      </button>
                      <input
                        accept="application/json"
                        className="event-saved-view-file-input"
                        onChange={importSavedViews}
                        ref={savedViewsImportInputRef}
                        type="file"
                      />
                    </div>
                    {savedViewMessage ? <div className="status">{savedViewMessage}</div> : null}
                    {savedViews.length > 0 ? (
                      <div className="event-preset-grid">
                        {savedViews.map((view) => {
                          const sameGroupViews = savedViews.filter(
                            (item) => item.pinned === view.pinned
                          );
                          const sameGroupIndex = sameGroupViews.findIndex(
                            (item) => item.id === view.id
                          );
                          const canMoveUp = sameGroupIndex > 0;
                          const canMoveDown =
                            sameGroupIndex < sameGroupViews.length - 1;

                          return (
                            <article
                              className={`event-preset-card${
                                activeSavedViewId === view.id ? " event-preset-card-active" : ""
                              }${view.pinned ? " event-preset-card-pinned" : ""}`}
                              key={view.id}
                            >
                              <strong>{view.pinned ? `Sabit • ${view.label}` : view.label}</strong>
                              <span>
                                {[
                                  normalizeSavedViewCategory(view.category)
                                    ? `Paket: ${normalizeSavedViewCategory(view.category)}`
                                    : null,
                                  getOptionLabel(EVENT_FILTER_OPTIONS, view.filters.status),
                                  getOptionLabel(EVENT_DATE_FILTER_OPTIONS, view.filters.date),
                                  getOptionLabel(EVENT_QUICK_FILTER_OPTIONS, view.filters.quick)
                                ]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </span>
                              {editingSavedViewId === view.id ? (
                                <div className="event-saved-view-form event-saved-view-inline-form">
                                  <input
                                    onChange={(event) => setEditingSavedViewName(event.target.value)}
                                    value={editingSavedViewName}
                                  />
                                  <div className="event-saved-view-actions">
                                    <button onClick={() => renameSavedView(view.id)} type="button">
                                      Kaydet
                                    </button>
                                    <button onClick={cancelRenamingSavedView} type="button">
                                      Iptal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="event-saved-view-actions">
                                  <button
                                    disabled={!canMoveUp}
                                    onClick={() => moveSavedView(view.id, "up")}
                                    type="button"
                                  >
                                    Yukari
                                  </button>
                                  <button
                                    disabled={!canMoveDown}
                                    onClick={() => moveSavedView(view.id, "down")}
                                    type="button"
                                  >
                                    Asagi
                                  </button>
                                  <button
                                    className={view.pinned ? "event-saved-view-pin-active" : ""}
                                    onClick={() => toggleSavedViewPinned(view.id)}
                                    type="button"
                                  >
                                    {view.pinned ? "Sabiti Kaldir" : "Uste Sabitle"}
                                  </button>
                                  <button
                                    className={
                                      view.sharedWithTeam ? "event-saved-view-share-active" : ""
                                    }
                                    onClick={() => toggleSavedViewShared(view.id)}
                                    type="button"
                                  >
                                    {view.sharedWithTeam
                                      ? "Paylasimi Kaldir"
                                      : "Ekiple Paylas"}
                                  </button>
                                  <button onClick={() => applySavedView(view.id)} type="button">
                                    Ac
                                  </button>
                                  <button
                                    onClick={() => startRenamingSavedView(view.id)}
                                    type="button"
                                  >
                                    Yeniden Adlandir
                                  </button>
                                  <button
                                    className="event-saved-view-delete"
                                    onClick={() => deleteSavedView(view.id)}
                                    type="button"
                                  >
                                    Sil
                                  </button>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="event-list-empty">
                        Henuz kayitli gorunum yok. Mevcut filtre setine isim verip saklayabilirsin.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {adminSidebarPanel === "shared" ? (
              <div className="admin-sections">
                <section className="admin-block">
                  <div className="eyebrow">Ekip</div>
                  <h3>Paylasilan gorunumler</h3>
                  <p className="muted">
                    Ekipten gelen filtre setlerini ara, favorile ve kendi listene kopyala.
                  </p>
                  {sharedSavedViews.length > 0 ? (
                    <div className="event-preset-section">
                      <div className="event-preset-head">
                        <strong>Ekipten Gelen Gorunumler</strong>
                        <span>
                          {filteredSharedSavedViews.length}/{sharedSavedViews.length} gorunum
                        </span>
                      </div>
                      <label className="event-search-field event-shared-view-search-field">
                        <span>Ekip gorunumu ara</span>
                        <input
                          onChange={(event) =>
                            setSharedSavedViewSearchQuery(event.target.value)
                          }
                          placeholder="Gorunum adi, sahip ya da filtre"
                          value={sharedSavedViewSearchQuery}
                        />
                      </label>
                      {sharedSavedViewCategories.length > 0 ? (
                        <div className="event-shared-view-category-row">
                          <button
                            className={
                              sharedSavedViewCategoryFilter === "all"
                                ? "event-shared-view-category-active"
                                : ""
                            }
                            onClick={() => setSharedSavedViewCategoryFilter("all")}
                            type="button"
                          >
                            Tum Paketler
                          </button>
                          {sharedSavedViewCategories.map((category) => (
                            <button
                              className={
                                sharedSavedViewCategoryFilter === category
                                  ? "event-shared-view-category-active"
                                  : ""
                              }
                              key={category}
                              onClick={() => setSharedSavedViewCategoryFilter(category)}
                              type="button"
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {filteredSharedSavedViews.length > 0 ? (
                        <div className="event-preset-grid">
                          {filteredSharedSavedViews.map((view) => (
                            <article
                              className={`event-preset-card event-preset-card-shared${
                                activeSharedSavedViewId === view.id
                                  ? " event-preset-card-active"
                                  : ""
                              }`}
                              key={view.id}
                            >
                              <strong>
                                {favoriteSharedSavedViewIds.includes(view.id)
                                  ? `Favori • ${view.label}`
                                  : view.label}
                              </strong>
                              <span>
                                {view.ownerName ?? view.ownerEmail ?? "Ekip gorunumu"}
                                {" / "}
                                {[
                                  normalizeSavedViewCategory(view.category)
                                    ? `Paket: ${normalizeSavedViewCategory(view.category)}`
                                    : null,
                                  getOptionLabel(EVENT_FILTER_OPTIONS, view.filters.status),
                                  getOptionLabel(EVENT_DATE_FILTER_OPTIONS, view.filters.date),
                                  getOptionLabel(EVENT_QUICK_FILTER_OPTIONS, view.filters.quick)
                                ]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </span>
                              <div className="event-shared-view-meta">
                                Son kullanim:{" "}
                                {formatRelativeDateTime(
                                  sharedSavedViewUsageMap[view.id]?.lastUsedAt ?? null
                                )}
                                {" • "}
                                Acilis: {sharedSavedViewUsageMap[view.id]?.applyCount ?? 0}
                                {" • "}
                                Kopya: {sharedSavedViewUsageMap[view.id]?.copyCount ?? 0}
                              </div>
                              <div className="event-saved-view-actions">
                                <button
                                  className={
                                    favoriteSharedSavedViewIds.includes(view.id)
                                      ? "event-saved-view-favorite-active"
                                      : ""
                                  }
                                  onClick={() => toggleSharedSavedViewFavorite(view.id)}
                                  type="button"
                                >
                                  {favoriteSharedSavedViewIds.includes(view.id)
                                    ? "Favoriden Cikar"
                                    : "Favori"}
                                </button>
                                <button onClick={() => applySavedView(view.id)} type="button">
                                  Ac
                                </button>
                                <button
                                  onClick={() => copySharedViewToMine(view.id)}
                                  type="button"
                                >
                                  Kendi Listeme Kopyala
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="event-list-empty">
                          Bu aramaya uyan ekip gorunumu bulunamadi.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="event-list-empty">
                      Henuz ekipten paylasilan gorunum yok. Paylasilan setler burada toplanacak.
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </>
        ) : (
        <div className="admin-event-detail-shell">
          <header className="panel event-detail-topbar">
            <div>
              <h1>Event Details</h1>
              <p>Home / Event Details</p>
            </div>
            <div className="event-detail-topbar-actions">
              <button
                className="button"
                disabled={!selectedEvent}
                onClick={() => setAdminEventDetailTab("photos")}
                type="button"
              >
                + Fotoğraf Yükle
              </button>
              {selectedEvent ? (
                <a className="button-secondary" href={guestPath} target="_blank">
                  {selectedEventAccess.openLabel}
                </a>
              ) : null}
              <button
                className="button-secondary"
                disabled={!selectedEvent}
                onClick={() => {
                  setAdminMainPanel("settings");
                  setAdminSidebarPanel("event");
                }}
                type="button"
              >
                Ayarlara Git
              </button>
            </div>
          </header>

          {selectedEvent ? (
            <>
              <section className="panel event-detail-hero">
                  <div className="event-detail-hero-grid">
                  <div className="event-detail-hero-image-wrap">
                    <div
                      aria-hidden="true"
                      className={[
                        "event-detail-hero-image",
                        selectedCover ?? selectedEventCover ? "event-detail-hero-image-has-cover" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={
                        selectedCover ?? selectedEventCover
                          ? { backgroundImage: `url(${selectedCover ?? selectedEventCover})` }
                          : undefined
                      }
                    />
                  </div>
                  <div className="event-detail-hero-copy">
                    <div className="event-detail-title-row">
                      <h2>{selectedEvent.title}</h2>
                      <span>{getEventStatusLabel(selectedEvent.status)}</span>
                    </div>
                    <div className="event-detail-link-row">
                      <strong>{selectedEventAccess.urlLabel}</strong>
                      <a href={guestPath} target="_blank">
                        {guestUrl || guestPath}
                      </a>
                      <small>{selectedEventCode}</small>
                    </div>
                    <div className="event-detail-link-row">
                      <strong>Etkinlik QR Kodu</strong>
                      <button
                        className="button-secondary"
                        onClick={downloadQrCode}
                        type="button"
                      >
                        QR İndir
                      </button>
                      <button
                        className="button-secondary"
                        onClick={() => copyGuestLink(guestUrl, selectedEvent.status)}
                        type="button"
                      >
                        {selectedEventAccess.copyLabel}
                      </button>
                    </div>
                    <div className="event-detail-stat-row">
                      <article>
                        <span>Tarih</span>
                        <strong>{formatDate(selectedEvent.event_date)}</strong>
                      </article>
                      <article>
                        <span>Fotolar</span>
                        <strong>{photos.length}</strong>
                      </article>
                      <article>
                        <span>Ziyaretçiler</span>
                        <strong>0</strong>
                      </article>
                      <article>
                        <span>Ziyaretçi Medyaları</span>
                        <strong>0</strong>
                      </article>
                    </div>
                  </div>
                </div>

                <nav className="event-detail-tabs">
                  <button
                    className={adminEventDetailTab === "general" ? "event-detail-tab-active" : ""}
                    onClick={() => setAdminEventDetailTab("general")}
                    type="button"
                  >
                    Genel
                  </button>
                  <button
                    className={adminEventDetailTab === "photographers" ? "event-detail-tab-active" : ""}
                    onClick={() => setAdminEventDetailTab("photographers")}
                    type="button"
                  >
                    Fotografcilar
                  </button>
                  <button
                    className={adminEventDetailTab === "photos" ? "event-detail-tab-active" : ""}
                    onClick={() => setAdminEventDetailTab("photos")}
                    type="button"
                  >
                    Media
                  </button>
                  <button
                    className={adminEventDetailTab === "materials" ? "event-detail-tab-active" : ""}
                    onClick={() => setAdminEventDetailTab("materials")}
                    type="button"
                  >
                    Tanitim Materyalleri
                  </button>
                </nav>
              </section>

              {adminEventDetailTab === "general" ? (
                <div className="admin-event-section-stack">
                  <section className="event-detail-chart-grid">
                    {selectedEventUserMetrics.map((metricGroup) => (
                      <article className="panel event-detail-chart" key={metricGroup.title}>
                        <h3>{metricGroup.title}</h3>
                        <div className="event-detail-donut-row">
                          <div className="event-detail-donut" />
                          <ul>
                            {metricGroup.items.map(([label, value]) => (
                              <li key={label}>
                                <span>{label}</span>
                                <strong>{value}</strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </section>

                  <section className="event-detail-metric-grid">
                    {selectedEventMetricColumns.map((column, columnIndex) => (
                      <article className="panel event-detail-metric-list" key={`metric-column-${columnIndex}`}>
                        {column.map(([label, value]) => (
                          <div className="event-detail-metric-row" key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </article>
                    ))}
                  </section>

                  <section className="panel event-detail-map">
                    <h3>Etkinlik Konumu</h3>
                    <div className="event-detail-map-toolbar">
                      <label className="field">
                        <span>Konum</span>
                        <input
                          onChange={(event) => setEventLocation(event.target.value)}
                          placeholder="Orn. Gusto Furniture, Dubai"
                          value={eventLocation}
                        />
                      </label>
                      <button
                        className="button-secondary"
                        disabled={loading}
                        onClick={() => void saveEventLocation()}
                        type="button"
                      >
                        Konumu Guncelle
                      </button>
                    </div>
                    {selectedEventMapUrl ? (
                      <div className="event-detail-map-frame">
                        <iframe
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={selectedEventMapUrl}
                          title={`${selectedEvent.title} konum haritasi`}
                        />
                      </div>
                    ) : (
                      <div className="event-detail-map-surface">
                        Konum bilgisi eklenmedi
                      </div>
                    )}
                  </section>
                </div>
              ) : null}

              {adminEventDetailTab === "photographers" ? (
                <section className="admin-event-section-stack">
                  <div className="event-detail-user-grid">
                    <article className="panel event-detail-user-card">
                      <div className="event-detail-user-card-head">
                        <strong>Gorevli Fotografcilar</strong>
                        <button className="button-secondary" onClick={addEventPhotographer} type="button">
                          + Gorevli Fotografci Ekle
                        </button>
                      </div>
                      <p className="muted">
                        Etkinlikte gorevli fotografcilari buradan ekleyebilir veya listeden
                        cikarabilirsin. Yeni bir hesap olusturuyorsan sifre de gir; sistem bu
                        bilgilerle kaydı oluşturur. Kaydettikten sonra davet bilgilerini
                        kopyalayabilirsin. Mevcut hesapta sifre alanini bos birakabilirsin.
                      </p>
                      <div className="event-photographer-list">
                        {selectedEventPhotographers.length > 0 ? (
                          selectedEventPhotographers.map((photographer) => (
                            <div className="event-photographer-inline-card" key={photographer.id}>
                              <div className="event-photographer-inline-fields">
                                <input
                                  onChange={(event) =>
                                    updateEventPhotographer(
                                      photographer.id,
                                      "name",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Fotografci adi"
                                  value={photographer.name}
                                />
                                <input
                                  onChange={(event) =>
                                    updateEventPhotographer(
                                      photographer.id,
                                      "email",
                                      event.target.value
                                    )
                                  }
                                  placeholder="mail@ornek.com"
                                  value={photographer.email}
                                />
                                <div className="event-photographer-password-field">
                                  <input
                                    type={isPhotographerPasswordVisible(photographer.id) ? "text" : "password"}
                                    onChange={(event) => {
                                      updateEventPhotographer(
                                        photographer.id,
                                        "password",
                                        event.target.value
                                      );
                                    }}
                                    placeholder="Sifre"
                                    value={photographer.password}
                                  />
                                  <button
                                    aria-label={
                                      isPhotographerPasswordVisible(photographer.id)
                                        ? "Şifreyi gizle"
                                        : "Şifreyi göster"
                                    }
                                    className="event-photographer-password-toggle button-secondary"
                                    onClick={() =>
                                      togglePhotographerPasswordVisibility(photographer.id)
                                    }
                                    type="button"
                                    title={
                                      isPhotographerPasswordVisible(photographer.id)
                                        ? "Şifreyi gizle"
                                        : "Şifreyi göster"
                                    }
                                  >
                                    {isPhotographerPasswordVisible(photographer.id) ? "🙈" : "👁"}
                                  </button>
                                </div>
                              </div>
                              <div className="event-photographer-inline-actions">
                                <button
                                  className="button"
                                  onClick={() => saveEventPhotographer(photographer.id)}
                                  type="button"
                                >
                                  {photographer.saved ? "Guncelle" : "Ekle"}
                                </button>
                                <button
                                  className="button-secondary"
                                  onClick={() => removeEventPhotographer(photographer.id)}
                                  type="button"
                                >
                                  Cikar
                                </button>
                              </div>
                              {photographer.email.trim() ? (
                                <div className="event-photographer-invite-card">
                                  <div className="event-photographer-invite-row">
                                    <span>E-posta</span>
                                    <strong>{photographer.email}</strong>
                                  </div>
                                  <div className="event-photographer-invite-row">
                                    <span>Sifre</span>
                                    <div className="event-photographer-password-summary">
                                      <strong>
                                        {isPhotographerPasswordVisible(photographer.id)
                                          ? photographer.password.trim() || "—"
                                          : getMaskedPhotographerPassword(photographer.password) ||
                                            "—"}
                                      </strong>
                                      <button
                                        aria-label={
                                          isPhotographerPasswordVisible(photographer.id)
                                            ? "Şifreyi gizle"
                                            : "Şifreyi göster"
                                        }
                                        className="event-photographer-password-toggle button-secondary"
                                        onClick={() =>
                                          togglePhotographerPasswordVisibility(photographer.id)
                                        }
                                        type="button"
                                        title={
                                          isPhotographerPasswordVisible(photographer.id)
                                            ? "Şifreyi gizle"
                                            : "Şifreyi göster"
                                        }
                                      >
                                        {isPhotographerPasswordVisible(photographer.id)
                                          ? "🙈"
                                          : "👁"}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="event-photographer-invite-actions">
                                    <button
                                      className="button-secondary"
                                      onClick={() => void copyPhotographerInvite(photographer)}
                                      type="button"
                                    >
                                      Davet Bilgilerini Kopyala
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <div className="empty">Henuz gorevli fotografci eklenmedi.</div>
                        )}
                      </div>
                    </article>
                  </div>
                </section>
              ) : null}

              {adminEventDetailTab === "photos" ? (
                <div className="admin-event-section-stack">
                  <section className="panel event-detail-metric-list">
                    <form className="admin-form" onSubmit={handleUpload}>
                      <label className="field">
                        <span>Etkinlik fotograflarini sec</span>
                        <input
                          multiple
                          onChange={(event) => setUploadFiles(event.target.files)}
                          type="file"
                        />
                      </label>
                      {selectedFileNames.length > 0 ? (
                        <div className="upload-selection-card">
                          <div className="upload-selection-header">
                            <strong>{selectedFileNames.length} dosya hazir</strong>
                            <button
                              className="button-secondary"
                              onClick={() => setUploadFiles(null)}
                              type="button"
                            >
                              Secimi Temizle
                            </button>
                          </div>
                          <div className="upload-file-chips">
                            {selectedFileNames.map((fileName) => (
                              <span className="upload-file-chip" key={fileName}>
                                {fileName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {uploadQueue.length > 0 ? (
                        <div className="upload-progress-card">
                          <div className="upload-progress-header">
                            <strong>
                              {uploadCompletedWithoutErrors && !shouldShowUploadQueueDetails
                                ? "Yükleme tamamlandı"
                                : "Yükleme durumu"}
                            </strong>
                            <span>
                              {uploadCompletedWithoutErrors && !shouldShowUploadQueueDetails
                                ? `${uploadDoneCount} fotoğraf galeriye eklendi`
                                : loading
                                  ? `%${uploadOverallProgress} tamamlandı`
                                  : `${uploadFinishedCount}/${uploadQueue.length} bitti`}
                            </span>
                          </div>
                          {shouldShowUploadQueueDetails ? (
                            <>
                              <div className="upload-progress-bar">
                                <span style={{ width: `${uploadOverallProgress}%` }} />
                              </div>
                              <div className="upload-queue">
                                {uploadQueue.map((item) => (
                                  <div className="upload-queue-item" key={item.fileName}>
                                    <div className="upload-queue-copy">
                                      <strong>{item.fileName}</strong>
                                      <span>
                                        {item.status === "pending" && "Bekliyor"}
                                        {item.status === "uploading" && `Yükleniyor ${item.progress}%`}
                                        {item.status === "processing" && "Yüzler indeksleniyor"}
                                        {item.status === "done" && "Tamamlandı"}
                                        {item.status === "error" &&
                                          (item.errorMessage ?? "Yükleme başarısız")}
                                      </span>
                                    </div>
                                    <div className="upload-progress-bar upload-progress-bar-small">
                                      <span
                                        className={`upload-progress-fill-${item.status}`}
                                        style={{ width: `${item.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {uploadCompletedWithoutErrors ? (
                                <div className="upload-progress-actions">
                                  <button
                                    className="button-secondary"
                                    onClick={() => setShowUploadQueueDetails(false)}
                                    type="button"
                                  >
                                    Listeyi Kapat
                                  </button>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="upload-progress-summary">
                              <p>Yükleme tamamlandı. Fotoğraflar aşağıdaki galeride görünüyor.</p>
                              <button
                                className="button-secondary"
                                onClick={() => setShowUploadQueueDetails(true)}
                                type="button"
                              >
                                Detayı Gör
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                      <button className="button" disabled={loading || !selectedEventId} type="submit">
                        Seçili Fotoğrafları Yükle
                      </button>
                    </form>
                    {uploadMessage ? <div className="status">{uploadMessage}</div> : null}
                  </section>

                  <section className="panel event-detail-metric-list">
                    <div className="photo-gallery-toolbar">
                      <div className="photo-gallery-filter-row">
                        <button
                          className={photoGalleryFilter === "all" ? "photo-gallery-filter-active" : ""}
                          onClick={() => { setPhotoGalleryFilter("all"); setSelectedPhotoIds(new Set()); }}
                          type="button"
                        >
                          Tum ({photoGalleryCounts.all})
                        </button>
                        <button
                          className={
                            photoGalleryFilter === "with_faces" ? "photo-gallery-filter-active" : ""
                          }
                          onClick={() => { setPhotoGalleryFilter("with_faces"); setSelectedPhotoIds(new Set()); }}
                          type="button"
                        >
                          Yuzu Olan ({photoGalleryCounts.with_faces})
                        </button>
                        <button
                          className={
                            photoGalleryFilter === "processing" ? "photo-gallery-filter-active" : ""
                          }
                          onClick={() => { setPhotoGalleryFilter("processing"); setSelectedPhotoIds(new Set()); }}
                          type="button"
                        >
                          Isleniyor ({photoGalleryCounts.processing})
                        </button>
                        <button
                          className={photoGalleryFilter === "ready" ? "photo-gallery-filter-active" : ""}
                          onClick={() => { setPhotoGalleryFilter("ready"); setSelectedPhotoIds(new Set()); }}
                          type="button"
                        >
                          Hazir ({photoGalleryCounts.ready})
                        </button>
                      </div>
                      <div className="photo-gallery-select-row">
                        <label className="photo-gallery-select-all">
                          <input
                            type="checkbox"
                            checked={filteredPhotos.length > 0 && selectedPhotoIds.size === filteredPhotos.length}
                            onChange={toggleSelectAll}
                          />
                          {selectedPhotoIds.size > 0
                            ? `${selectedVisiblePhotoCount} / ${filteredPhotos.length} görünürde seçili`
                            : "Bu görünümde tümünü seç"}
                        </label>
                        {selectedPhotoIds.size > 0 && (
                          <div className="photo-bulk-actions">
                            <button
                              className="button-secondary"
                              disabled={bulkActionLoading}
                              onClick={() => setSelectedPhotoIds(new Set())}
                              type="button"
                            >
                              Seçimi Temizle
                            </button>
                            <button
                              className="button-secondary"
                              disabled={bulkActionLoading}
                              onClick={bulkReindexSelectedPhotos}
                              type="button"
                            >
                              Yeniden İndeksle
                            </button>
                            <button
                              className="button-danger"
                              disabled={bulkActionLoading}
                              onClick={bulkDeleteSelectedPhotos}
                              type="button"
                            >
                              {bulkActionLoading ? "İşleniyor..." : "Sil"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="panel event-detail-metric-list">
                    <div className="event-detail-stat-row">
                      <article>
                        <span>Slug</span>
                        <strong>{selectedEvent.slug}</strong>
                      </article>
                      <article>
                        <span>Tarih</span>
                        <strong>{formatDate(selectedEvent.event_date)}</strong>
                      </article>
                      <article>
                        <span>Yüklü</span>
                        <strong>{photos.length} fotoğraf</strong>
                      </article>
                      <article>
                        <span>İndekslenen yüz</span>
                        <strong>{totalFaces}</strong>
                      </article>
                    </div>
                  </section>

                  <section className="panel event-detail-metric-list">
                    <div className="photo-admin-grid">
                      {filteredPhotos.map((photo) => {
                        const isSelected = selectedPhotoIds.has(photo.id);
                        return (
                          <article
                            className={`photo-card${isSelected ? " photo-card-selected" : ""}`}
                            key={photo.id}
                            onClick={() => togglePhotoSelection(photo.id)}
                          >
                            <div className="photo-card-checkbox">
                              <input
                                checked={isSelected}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => togglePhotoSelection(photo.id)}
                                type="checkbox"
                              />
                            </div>
                            <div className="photo-frame">
                              <img
                                alt={photo.file_name}
                                className="photo-media"
                                src={photo.thumbnail_url || photo.preview_url || photo.original_url}
                              />
                            </div>
                            <div className="photo-meta">
                              <strong>{photo.file_name}</strong>
                              <span className="score-pill">{photo.faces_detected} yüz</span>
                              <span className="muted">Durum: {photo.processing_status}</span>
                              <span className="muted">
                                Yükleyen:{" "}
                                {photo.uploaded_by?.full_name ??
                                  photo.uploaded_by?.email ??
                                  "Bilinmiyor"}
                              </span>
                            </div>
                          </article>
                        );
                      })}
                      {photos.length === 0 ? (
                        <div className="empty">Bu etkinliğe henüz fotoğraf yüklenmedi.</div>
                      ) : filteredPhotos.length === 0 ? (
                        <div className="empty">Bu galeri filtresinde fotoğraf bulunamadi.</div>
                      ) : null}
                    </div>
                  </section>
                </div>
              ) : null}

              {adminEventDetailTab === "materials" ? (
                <div className="admin-event-section-stack">
                  <section className="panel event-detail-materials">
                    <div className="event-detail-materials-head">
                      <h3>Tanitim Materyalleri</h3>
                      <span>{selectedEventMaterialReadyCount} materyal hazir</span>
                    </div>
                    <div className="event-detail-material-grid">
                      <article className="event-detail-material-card">
                        <strong>Kapak Gorseli</strong>
                        <div
                          className={`event-detail-material-visual${
                            selectedCover ?? selectedEventCover ? " event-detail-material-visual-image" : ""
                          }`}
                          style={
                            selectedCover ?? selectedEventCover
                              ? { backgroundImage: `url(${selectedCover ?? selectedEventCover})` }
                              : undefined
                          }
                        />
                        <span>
                          {selectedCover ?? selectedEventCover
                            ? "Misafir sayfasinda ve kart gorunumlerinde kullanilir."
                            : "Kapak gorseli eklenmedi."}
                        </span>
                        <div className="event-detail-card-actions">
                          <button
                            className="button-secondary"
                            onClick={() => coverInputRef.current?.click()}
                            type="button"
                          >
                            {selectedCover ? "Kapagi Degistir" : "Kapak Ekle"}
                          </button>
                          {selectedCover ? (
                            <button
                              className="button-secondary"
                              onClick={() => {
                                setCoverImages([]);
                                setSelectedCover(null);
                              }}
                              type="button"
                            >
                              Kaldir
                            </button>
                          ) : null}
                          <input
                            accept="image/*"
                            className="event-detail-hidden-file"
                            onChange={(event) => void handlePickCoverImage(event.target.files)}
                            ref={coverInputRef}
                            type="file"
                          />
                        </div>
                      </article>

                      <article className="event-detail-material-card">
                        <strong>Cerceve Stili</strong>
                        <div
                          className="event-detail-material-frame-style"
                          style={
                            {
                              "--frame-color": frameColor ?? "#ffffff",
                              "--frame-edge": `${previewFrameEdge}px`,
                              "--frame-logo-band": `${previewLogoBand}px`,
                              "--frame-logo-height": `${previewLogoHeight}px`
                            } as CSSProperties
                          }
                        >
                          <div className="event-detail-material-frame-inner" />
                          <div className="event-detail-material-frame-logo-zone">
                            {logoAsset ? (
                              <img alt="" src={logoAsset} />
                            ) : (
                              <div className="event-detail-material-frame-logo-zone-empty" />
                            )}
                          </div>
                        </div>
                        <span>
                          Bu onizleme sadece cerceve alanini gosterir.
                          Gercek fotograflarda logo alt orta banda otomatik yerlestirilir.
                        </span>
                        <div className="event-detail-frame-style-controls">
                          <span>Cerceve Rengi</span>
                          <div className="event-frame-swatch-row">
                            {FRAME_STYLE_SWATCHES.map((swatch) => (
                              <button
                                aria-label={`${swatch.label} cerceve`}
                                className={[
                                  "event-frame-swatch",
                                  frameColor === swatch.value ? "event-frame-swatch-active" : "",
                                  swatch.value === "#ffffff" ? "event-frame-swatch-light" : ""
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                key={swatch.value}
                                onClick={() => setFrameColor(swatch.value)}
                                style={{ backgroundColor: swatch.value }}
                                title={swatch.label}
                                type="button"
                              />
                            ))}
                          </div>
                          <div className="event-frame-thickness-row">
                            <span>Cerceve kalinligi</span>
                            <strong>{normalizedFrameThickness}</strong>
                          </div>
                          <input
                            className="event-frame-thickness-slider"
                            max={48}
                            min={20}
                            onChange={(event) => {
                              const nextValue = Number.parseInt(event.target.value, 10);
                              setFrameThickness(
                                Math.max(20, Math.min(48, Number.isNaN(nextValue) ? 32 : nextValue))
                              );
                            }}
                            step={1}
                            type="range"
                            value={normalizedFrameThickness}
                          />
                        </div>
                      </article>

                      <article className="event-detail-material-card">
                        <strong>Logo</strong>
                        <div className="event-detail-material-logo-stage">
                          <div className="event-detail-material-logo-grid" />
                          {logoAsset ? (
                            <img
                              alt="Etkinlik logosu"
                              className="event-detail-material-logo-image"
                              src={logoAsset}
                            />
                          ) : (
                            <span className="event-detail-material-empty">Logo eklenmedi</span>
                          )}
                        </div>
                        <span>Galeri uzerinde ve framed output'larda gorunur.</span>
                        <div className="event-detail-card-actions">
                          <button
                            className="button-secondary"
                            onClick={() => logoInputRef.current?.click()}
                            type="button"
                          >
                            {logoAsset ? "Logoyu Degistir" : "Logo Ekle"}
                          </button>
                          {logoAsset ? (
                            <button
                              className="button-secondary"
                              onClick={() => setLogoAsset(null)}
                              type="button"
                            >
                              Logoyu Kaldir
                            </button>
                          ) : null}
                          <input
                            accept="image/*"
                            className="event-detail-hidden-file"
                            onChange={(event) =>
                              void pickSingleMaterialImage(event.target.files, setLogoAsset)
                            }
                            ref={logoInputRef}
                            type="file"
                          />
                        </div>
                      </article>

                      <article className="event-detail-material-card">
                        <strong>QR Kimligi</strong>
                        <div className="event-detail-material-qr">
                          {qrPreviewUrl ? (
                            <img alt={`${selectedEvent.title} etkinlik QR kodu`} className="event-detail-material-qr-image" src={qrPreviewUrl} />
                          ) : null}
                          {qrLogo ? (
                            <div className="event-detail-material-qr-core">
                              <img alt="QR logo" src={qrLogo} />
                            </div>
                          ) : null}
                        </div>
                        <span>QR merkezinde gorunen etkinlik kimligi. Bir kez olusturulur ve sabit kalir.</span>
                      </article>
                    </div>
                  </section>

                  <section className="panel event-detail-material-summary">
                    {selectedEventMaterialRows.map(([label, value]) => (
                      <div className="event-detail-material-summary-row" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </section>

                  <section className="panel event-detail-settings-shell">
                    <div className="cta-row">
                      <button className="button" disabled={loading} onClick={() => void saveEventMaterials()} type="button">
                        {loading ? "Kaydediliyor..." : "Materyal Degisikliklerini Kaydet"}
                      </button>
                    </div>
                    {materialSaveNotice ? (
                      <div
                        className={`status ${
                          materialSaveNotice.type === "success" ? "status-success" : "status-error"
                        }`}
                      >
                        {materialSaveNotice.text}
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : null}
            </>
          ) : (
            <section className="panel event-detail-hero">
              <div className="empty">Sol menuden bir etkinlik sec. Sag panel event detail workspace olarak acilacak.</div>
            </section>
          )}
        </div>
        )}
      </div>
    </section>
  );
}
