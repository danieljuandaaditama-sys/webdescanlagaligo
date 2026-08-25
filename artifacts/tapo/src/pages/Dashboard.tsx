import { useState, useMemo } from "react";
import {
  getHousingSummary,
  getHousingChartData,
  getHousingInsight,
  listHouses,
  listChangedHouses,
} from "@/data/localHousing";
import { Link } from "wouter";
import {
  Home, Activity, CheckCircle2, ChevronLeft, ChevronRight,
  BarChart3, Info, Map, AlertCircle, ExternalLink,
  Shield, Building2, Layers, SquareDashed, Check,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import { LeafletMapEngine } from "@/components/map/LeafletMapEngine";

// ─── Color helpers ──────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#EAB308", "#06B6D4",
];

function klasterColor(klaster: string) {
  if (klaster === "K1") return "#22C55E";
  if (klaster === "K2") return "#F59E0B";
  if (klaster === "K3") return "#EF4444";
  return "#9CA3AF";
}
function statusColor(s: string) { return s === "berubah" ? "#EF4444" : "#22C55E"; }
function lantaiColor(l: string | null | undefined) {
  if (l === "Keramik") return "#3B82F6";
  if (l === "Marmer/Granit") return "#8B5CF6";
  if (l === "Semen") return "#F59E0B";
  if (l === "Kayu") return "#78716C";
  return "#9CA3AF";
}
function atapColor(a: string | null | undefined) {
  if (a === "Genteng") return "#2563EB";
  if (a === "Seng") return "#F59E0B";
  if (a === "Asbes") return "#EF4444";
  return "#9CA3AF";
}
function dindingColor(d: string | null | undefined) {
  if (d === "Tembok") return "#2563EB";
  if (d === "Kayu") return "#78716C";
  if (d === "Bambu") return "#22C55E";
  if (d === "Seng") return "#F59E0B";
  return "#9CA3AF";
}

function getJenisLabel(h: any): string {
  const list: string[] = [];
  if (h.perubahanPagar) list.push("Pagar");
  if (h.perubahanLuasBangunan) list.push("L.Bangunan");
  if (h.perubahanJumlahLantai) list.push("Jml Lantai");
  if (h.perubahanJenisLantai) list.push("J.Lantai");
  if (h.perubahanJenisDinding) list.push("J.Dinding");
  if (h.perubahanLuasLahan) list.push("L.Lahan");
  if (h.perubahanJenisAtap) list.push("J.Atap");
  return list.length > 0 ? list.join(", ") : "—";
}

// ─── Map filter configs ──────────────────────────────────────────────────────

const JENIS_LABEL: Record<string, string> = {
  perubahanPagar: "Perubahan Pagar",
  perubahanLuasBangunan: "Perubahan Luas Bangunan",
  perubahanLuasLahan: "Perubahan Luas Lahan",
  perubahanJumlahLantai: "Perubahan Jumlah Lantai",
};

const TAGGING_MODES: Record<string, {
  label: string;
  colorFn: (h: any) => string;
  legend: { label: string; color: string }[];
  /** Sorotan yang dihitung per-RW (true = masuk hitungan) */
  highlightFn: (h: any) => boolean;
  highlightLabel: string;
}> = {
  luasBangunan: {
    label: "Luas Bangunan",
    colorFn: (h) => {
      const v = h.luasBangunan;
      if (!v) return "#9CA3AF";
      if (v > 100) return "#EF4444";
      if (v >= 50) return "#F59E0B";
      return "#22C55E";
    },
    legend: [
      { label: "> 100 m²", color: "#EF4444" },
      { label: "50 – 100 m²", color: "#F59E0B" },
      { label: "< 50 m²", color: "#22C55E" },
    ],
    highlightFn: (h) => (h.luasBangunan ?? 0) > 100,
    highlightLabel: "> 100 m²",
  },
  luasLahan: {
    label: "Luas Lahan",
    colorFn: (h) => {
      const v = h.luasLahan;
      if (!v) return "#9CA3AF";
      if (v > 100) return "#EF4444";
      if (v >= 50) return "#F59E0B";
      return "#22C55E";
    },
    legend: [
      { label: "> 100 m²", color: "#EF4444" },
      { label: "50 – 100 m²", color: "#F59E0B" },
      { label: "< 50 m²", color: "#22C55E" },
    ],
    highlightFn: (h) => (h.luasLahan ?? 0) > 100,
    highlightLabel: "> 100 m²",
  },
  jumlahLantai: {
    label: "Tingkatan Rumah",
    colorFn: (h) => {
      const v = h.jumlahLantai;
      if (!v) return "#9CA3AF";
      if (v === 1) return "#A78BFA";
      if (v === 2) return "#7C3AED";
      return "#4C1D95";
    },
    legend: [
      { label: "Lantai 1", color: "#A78BFA" },
      { label: "Lantai 2", color: "#7C3AED" },
      { label: "Lantai 3+", color: "#4C1D95" },
    ],
    highlightFn: (h) => (h.jumlahLantai ?? 0) >= 2,
    highlightLabel: "≥ 2 Lantai",
  },
  jenisDinding: {
    label: "Jenis Dinding",
    colorFn: (h) => dindingColor(h.jenisDinding),
    legend: [
      { label: "Tembok", color: "#64748B" },
      { label: "Kayu", color: "#D97706" },
      { label: "Bambu/Seng", color: "#84CC16" },
    ],
    highlightFn: (h) => (h.jenisDinding ?? "").toLowerCase().includes("tembok"),
    highlightLabel: "Tembok",
  },
  jenisPlafon: {
    label: "Jenis Plafon",
    colorFn: (h) => {
      const v: string | null | undefined = h.jenisPlafon;
      if (!v) return "#9CA3AF";
      const lv = v.toLowerCase();
      if (lv.includes("triplek") || lv.includes("asbes") || lv.includes("bambu")) return "#3B82F6";
      if (lv.includes("pvc")) return "#10B981";
      if (lv.includes("beton") || lv.includes("plat")) return "#6B7280";
      if (lv.includes("kayu") || lv.includes("akustik") || lv.includes("gypsum") || lv.includes("kalsibor")) return "#F59E0B";
      return "#9CA3AF";
    },
    legend: [
      { label: "Triplek/Asbes/Bambu", color: "#3B82F6" },
      { label: "PVC", color: "#10B981" },
      { label: "Beton/Plat", color: "#6B7280" },
      { label: "Kayu/Gypsum/Kalsibor", color: "#F59E0B" },
      { label: "Tidak Ada/Lainnya", color: "#9CA3AF" },
    ],
    highlightFn: (h) => {
      const v: string = (h.jenisPlafon ?? "").toLowerCase();
      return v.includes("triplek") || v.includes("asbes") || v.includes("bambu");
    },
    highlightLabel: "Triplek/Asbes/Bambu",
  },
  jeniLantai: {
    label: "Jenis Lantai",
    colorFn: (h) => lantaiColor(h.jeniLantai),
    legend: [
      { label: "Keramik", color: "#3B82F6" },
      { label: "Marmer/Granit", color: "#8B5CF6" },
      { label: "Semen", color: "#F59E0B" },
      { label: "Kayu/Papan", color: "#78716C" },
    ],
    highlightFn: (h) => (h.jeniLantai ?? "").toLowerCase() === "keramik",
    highlightLabel: "Keramik",
  },
};

// ─── Asset path helper ───────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL; // e.g. "/tapo/"
const HOUSES_IMG = `${BASE}assets/houses-panels.png`;
const PANORAMIC_IMG = `${BASE}assets/village-panoramic.png`;

/**
 * Background-position values for each card using background-size: "600% auto".
 * The composite image has 3 panels in top row and 2 in bottom row.
 * Formula: p_x = (center_x_ratio × 5) × 100 / 5, p_y = (center_y_ratio × 2.51 - 0.5) / 2.51 × 100
 * Big card uses panel 1 (top-left house with road), set inline.
 */
const CARD_BG_POS: Record<string, string> = {
  "Perubahan Pagar":         "50% 19%",  // top-center (house + fence)
  "Perubahan Luas Bangunan": "91% 19%",  // top-right  (under construction)
  "Perubahan Luas Lahan":    "20% 81%",  // bottom-left (rural landscape)
  "Perubahan Jumlah Lantai": "82% 81%",  // bottom-right (2-story house)
};

// ─── Main ───────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // Dataset is fixed, so Dashboard reads directly from the local data adapter.
  const summary = getHousingSummary();
  const chartData = getHousingChartData();
  const insight = getHousingInsight();
  const allHouses = listHouses();
  const changedHouses = listChangedHouses();

  const sumLoading = false;
  const chartLoading = false;
  const insightLoading = false;
  const allLoading = false;
  const changedLoading = false;

  const [insightSlide, setInsightSlide] = useState(0);
  const [searchAll, setSearchAll] = useState("");
  const [searchChanged, setSearchChanged] = useState("");
  const [pageAll, setPageAll] = useState(1);
  const [pageChanged, setPageChanged] = useState(1);
  // Map tab & filters
  const [mapTab, setMapTab] = useState<"klaster" | "smart" | "tagging">("klaster");
  const [klasterFilter, setKlasterFilter] = useState<string | null>(null);
  // SMART MAP: which perubahan type to highlight
  const [dashSmartJenis, setDashSmartJenis] = useState<string>("perubahanJenisLantai");
  // Peta Tagging: which attribute to color by
  const [taggingMode, setTaggingMode] = useState<string>("luasBangunan");

  const PER_PAGE = 10;

  const insightSlides = useMemo(() => {
    if (!insight) return [];
    return [insight.ringkasan, ...insight.poin];
  }, [insight]);

  // Filtered map data — must be above early return (Rules of Hooks)
  const klasterMapData = useMemo(
    () =>
      klasterFilter
        ? (allHouses ?? []).filter((h) => h.klaster === klasterFilter)
        : allHouses ?? [],
    [allHouses, klasterFilter],
  );

  // SMART MAP: per-RW breakdown for the selected jenis perubahan
  const dashSmartPerRw = useMemo(() => {
    const rwMap: Record<string, { berubah: number; total: number }> = {};
    (allHouses ?? []).forEach((h) => {
      if (!rwMap[h.rw]) rwMap[h.rw] = { berubah: 0, total: 0 };
      rwMap[h.rw].total++;
      if ((h as any)[dashSmartJenis]) rwMap[h.rw].berubah++;
    });
    return Object.entries(rwMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([rw, { berubah, total }]) => ({ rw, berubah, total }));
  }, [allHouses, dashSmartJenis]);

  const dashSmartTotal = useMemo(
    () => (allHouses ?? []).filter((h) => (h as any)[dashSmartJenis]).length,
    [allHouses, dashSmartJenis],
  );

  // Tagging: per-RW breakdown (highlight category per mode)
  const taggingPerRw = useMemo(() => {
    const mode = TAGGING_MODES[taggingMode];
    if (!mode) return [];
    const rwMap: Record<string, { highlight: number; total: number }> = {};
    (allHouses ?? []).forEach((h) => {
      if (!rwMap[h.rw]) rwMap[h.rw] = { highlight: 0, total: 0 };
      rwMap[h.rw].total++;
      if (mode.highlightFn(h)) rwMap[h.rw].highlight++;
    });
    return Object.entries(rwMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([rw, { highlight, total }]) => ({ rw, highlight, total }));
  }, [allHouses, taggingMode]);

  // Tagging: dynamic insight text
  const taggingInsightText = useMemo(() => {
    const total = (allHouses ?? []).length;
    if (!total) return "";
    if (taggingMode === "luasBangunan" || taggingMode === "luasLahan") {
      const field = taggingMode as "luasBangunan" | "luasLahan";
      const big = (allHouses ?? []).filter((h) => (h[field] ?? 0) > 100).length;
      const med = (allHouses ?? []).filter((h) => { const v = h[field] ?? 0; return v >= 50 && v <= 100; }).length;
      const small = (allHouses ?? []).filter((h) => { const v = h[field] ?? 0; return v > 0 && v < 50; }).length;
      const lbl = taggingMode === "luasBangunan" ? "Luas Bangunan" : "Luas Lahan";
      return `${lbl}: ${big} rumah >100m², ${med} rumah 50–100m², ${small} rumah <50m².`;
    }
    const mode = TAGGING_MODES[taggingMode];
    return `Peta menampilkan distribusi ${mode?.label.toLowerCase() ?? taggingMode} dari ${total} rumah terdata.`;
  }, [allHouses, taggingMode]);

  // Sorted bar chart data
  const barData = useMemo(
    () =>
      [...(chartData?.jenisPerubahan ?? [])]
        .sort((a, b) => b.jumlah - a.jumlah)
        .map((d, i) => ({ ...d, fill: CHART_COLORS[i % CHART_COLORS.length] })),
    [chartData],
  );

  const filterAndPage = (data: any[], search: string, page: number) => {
    const lower = search.toLowerCase();
    const filtered = search
      ? data.filter((h) =>
          h.namaKepalaKeluarga?.toLowerCase().includes(lower) ||
          h.alamat?.toLowerCase().includes(lower),
        )
      : data;
    const total = Math.ceil(filtered.length / PER_PAGE) || 1;
    const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    return { paged, total, count: filtered.length };
  };

  if (sumLoading || chartLoading || insightLoading || allLoading || changedLoading) {
    return <DashboardSkeleton />;
  }

  const validJenis = (summary?.byJenisPerubahan ?? []).filter((j) => j.jumlah > 0);
  const { paged: pagedAll, total: totalAllPages, count: countAll } =
    filterAndPage(allHouses ?? [], searchAll, pageAll);
  const { paged: pagedChanged, total: totalChangedPages, count: countChanged } =
    filterAndPage(changedHouses ?? [], searchChanged, pageChanged);

  // Klaster counts
  const klasterCounts = Object.fromEntries(
    (summary?.byKlaster ?? []).map((k) => [k.label, k.jumlah]),
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard WebGIS{" "}
          <span className="text-primary">Desa Cantik</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ringkasan perubahan bangunan Kelurahan Dangerakko tahun 2026
        </p>
      </div>

      {/* ── SUMMARY + SMART INSIGHT ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left column: Big stat + Smart Insight */}
        <div className="flex flex-col gap-4">
          {/* X / Y stat — gradient card */}
          <div
            className="rounded-2xl p-6 shadow-lg relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #3B6EF8 0%, #2952D9 60%, #1E3FB8 100%)" }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10" style={{ background: "white" }} />
            <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full opacity-10" style={{ background: "white" }} />
            {/* House illustration — top-left panel (house with road) */}
            <div
              className="absolute right-0 top-0 w-[54%] h-full pointer-events-none"
              style={{
                backgroundImage: `url(${HOUSES_IMG})`,
                backgroundSize: "600% auto",
                backgroundPosition: "9% 19%",
                backgroundRepeat: "no-repeat",
                opacity: 0.42,
                mixBlendMode: "luminosity",
              }}
            />

            <div className="relative">
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white leading-none tracking-tight">
                  {summary?.rumahBerubah ?? "—"}
                </span>
                <span className="text-2xl font-medium text-white/50 leading-none">
                  /{summary?.totalRumah ?? "—"}
                </span>
              </div>
              <p className="text-base font-bold text-white mt-2">
                Rumah Mengalami Perubahan
              </p>
              <div className="flex gap-2 mt-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
                  {summary?.persenPerubahan.toFixed(1)}% berubah
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}>
                  {(100 - (summary?.persenPerubahan ?? 0)).toFixed(1)}% stabil
                </span>
              </div>
            </div>
          </div>

          {/* Smart Insight carousel */}
          <Card className="border shadow-sm flex-1">
            <CardContent className="pt-4 pb-4 px-5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-widest text-primary uppercase">
                  Smart Insight
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setInsightSlide((s) => Math.max(0, s - 1))}
                    disabled={insightSlide === 0}
                    className="w-6 h-6 rounded-full border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() =>
                      setInsightSlide((s) => Math.min(insightSlides.length - 1, s + 1))
                    }
                    disabled={insightSlide === insightSlides.length - 1}
                    className="w-6 h-6 rounded-full border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="text-sm leading-relaxed flex-1 text-foreground">
                {insightSlides[insightSlide] ?? ""}
              </p>

              {/* Dot indicators */}
              <div className="flex gap-1.5 mt-4">
                {insightSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setInsightSlide(i)}
                    className={[
                      "h-1.5 rounded-full transition-all duration-200",
                      i === insightSlide
                        ? "bg-primary w-5"
                        : "bg-muted-foreground/25 w-1.5 hover:bg-muted-foreground/50",
                    ].join(" ")}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: 4 highlighted stat cards */}
        {(() => {
          const countOf = (label: string) =>
            validJenis.find((j) => j.label === label)?.jumlah ?? 0;
          const total = (allHouses ?? []).length;
          const pct = (n: number) =>
            total > 0 ? `${((n / total) * 100).toFixed(0)}% rumah` : "—";

          const CARDS = [
            {
              label: "Perubahan Pagar",
              sublabel: "Rumah yg pagarnya berubah",
              icon: Shield,
              count: countOf("Perubahan Pagar"),
              from: "#3B82F6", to: "#1D4ED8",
              light: "#EFF6FF",
              iconColor: "#93C5FD",
            },
            {
              label: "Perubahan Luas Bangunan",
              sublabel: "Perluasan/pengurangan bangunan",
              icon: Building2,
              count: countOf("Perubahan Luas Bangunan"),
              from: "#8B5CF6", to: "#6D28D9",
              light: "#F5F3FF",
              iconColor: "#C4B5FD",
            },
            {
              label: "Perubahan Luas Lahan",
              sublabel: "Perubahan ukuran lahan",
              icon: SquareDashed,
              count: countOf("Perubahan Luas Lahan"),
              from: "#F97316", to: "#C2410C",
              light: "#FFF7ED",
              iconColor: "#FED7AA",
            },
            {
              label: "Perubahan Jumlah Lantai",
              sublabel: "Penambahan tingkat bangunan",
              icon: Layers,
              count: countOf("Perubahan Jumlah Lantai"),
              from: "#10B981", to: "#065F46",
              light: "#ECFDF5",
              iconColor: "#6EE7B7",
            },
          ] as const;

          return (
            <div className="lg:col-span-2 grid grid-cols-2 gap-3">
              {CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <Card
                    key={card.label}
                    className="border-0 shadow-md overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${card.from} 0%, ${card.to} 100%)` }}
                  >
                    <CardContent className="p-5 relative overflow-hidden h-full min-h-[130px]">
                      {/* House illustration — specific panel per card */}
                      <div
                        className="absolute right-0 top-0 w-[54%] h-full pointer-events-none"
                        style={{
                          backgroundImage: `url(${HOUSES_IMG})`,
                          backgroundSize: "600% auto",
                          backgroundPosition: CARD_BG_POS[card.label] ?? "50% 50%",
                          backgroundRepeat: "no-repeat",
                          opacity: 0.38,
                          mixBlendMode: "luminosity",
                        }}
                      />
                      {/* Large decorative background icon */}
                      <Icon
                        className="absolute -bottom-3 -right-3 opacity-[0.08]"
                        style={{ width: 110, height: 110, color: "white" }}
                        strokeWidth={1}
                      />
                      {/* Small icon badge */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: "rgba(255,255,255,0.20)" }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      {/* Label */}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 leading-tight">
                        {card.label}
                      </p>
                      {/* Big number */}
                      <p className="text-5xl font-black font-mono text-white leading-none mt-1">
                        {card.count}
                      </p>
                      {/* Sub-info */}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "rgba(255,255,255,0.20)", color: "white" }}
                        >
                          {pct(card.count)}
                        </span>
                        <span className="text-[10px] text-white/60">{card.sublabel}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── CONTENT TABS: Grafik | Tabel Seluruhnya | Tabel Perubahan ── */}
      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
        <Tabs defaultValue="grafik">
          <div className="border-b px-1">
            <TabsList className="bg-transparent h-auto rounded-none gap-0 p-0">
              {[
                { value: "grafik", label: "Grafik Perubahan" },
                { value: "all", label: "Tabel Seluruhnya" },
                { value: "changed", label: "Tabel Perubahan" },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Grafik Perubahan */}
          <TabsContent value="grafik" className="m-0 p-5">
            <h3 className="text-sm font-semibold mb-1">Perubahan paling dominan</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Distribusi jenis perubahan yang terdeteksi pada rumah-rumah di Kelurahan Dangerakko
            </p>
            {barData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data perubahan.</p>
            ) : (
              <div className="flex flex-col lg:flex-row items-center gap-6">
                {/* Donut chart */}
                <div className="w-full lg:w-64 shrink-0">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={barData}
                        dataKey="jumlah"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                      >
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`${v} rumah`, "Jumlah"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Total di tengah - overlay text */}
                  <p className="text-center -mt-4 text-xs text-muted-foreground">
                    Total:{" "}
                    <span className="font-bold text-foreground">
                      {barData.reduce((s, d) => s + d.jumlah, 0)}
                    </span>{" "}
                    perubahan
                  </p>
                </div>

                {/* Keterangan / legend */}
                <div className="flex-1 w-full space-y-2">
                  {barData.map((entry) => {
                    const total = barData.reduce((s, d) => s + d.jumlah, 0);
                    const pct = total > 0 ? ((entry.jumlah / total) * 100).toFixed(1) : "0";
                    return (
                      <div key={entry.label} className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: entry.fill }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="font-medium text-foreground truncate">{entry.label}</span>
                            <span className="font-mono font-bold ml-2 shrink-0">
                              {entry.jumlah} <span className="text-muted-foreground font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: entry.fill,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tabel Seluruhnya */}
          <TabsContent value="all" className="m-0">
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Input
                  placeholder="Cari Nama KK atau Alamat..."
                  value={searchAll}
                  onChange={(e) => { setSearchAll(e.target.value); setPageAll(1); }}
                  className="pl-8 h-8 text-sm"
                />
                <Info className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">{countAll} data</span>
            </div>
            <RawDataTable data={pagedAll} page={pageAll} totalPages={totalAllPages} onPageChange={setPageAll} />
          </TabsContent>

          {/* Tabel Perubahan */}
          <TabsContent value="changed" className="m-0">
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Input
                  placeholder="Cari Nama KK atau Alamat..."
                  value={searchChanged}
                  onChange={(e) => { setSearchChanged(e.target.value); setPageChanged(1); }}
                  className="pl-8 h-8 text-sm"
                />
                <Info className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">{countChanged} rumah berubah</span>
            </div>
            <ChangesTable data={pagedChanged} page={pageChanged} totalPages={totalChangedPages} onPageChange={setPageChanged} />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── PETA SECTION ─────────────────────────────────────────────── */}
      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
        <Tabs value={mapTab} onValueChange={(v) => setMapTab(v as typeof mapTab)}>
          <div className="border-b px-1">
            <div className="flex items-center justify-between pr-4">
              <TabsList className="bg-transparent h-auto rounded-none gap-0 p-0">
                {[
                  { value: "klaster", label: "Peta Klasterisasi" },
                  { value: "smart", label: "SMART MAP" },
                  { value: "tagging", label: "Peta Tagging Location" },
                ].map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-primary"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Link
                href="/smart-map"
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
              >
                Buka Smart Map <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* PETA KLASTERISASI */}
          <TabsContent value="klaster" className="m-0">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 min-w-0">
                <LeafletMapEngine
                  data={klasterMapData}
                  height="420px"
                  colorByField="klaster"
                  colorMap={klasterColor}
                  legend={[]}
                  popupContent={(h) => (
                    <div className="space-y-1">
                      <div className="font-bold text-sm">{h.id}</div>
                      <div className="text-xs">{h.namaKepalaKeluarga}</div>
                      <div className="text-xs text-muted-foreground">{h.rt} · {h.rw}</div>
                      <Badge className="text-[10px]" style={{ backgroundColor: klasterColor(h.klaster) }}>
                        {h.klaster} · {h.jumlahJenisPerubahan} perubahan
                      </Badge>
                    </div>
                  )}
                />
              </div>
              {/* Sidebar Klaster */}
              <div className="lg:w-56 xl:w-64 border-t lg:border-t-0 lg:border-l p-4 flex flex-col gap-3">
                {[
                  { key: "K1", label: "K1 — Tidak ada perubahan", sub: "0 jenis", color: "#22C55E", desc: `${klasterCounts["K1"] ?? 0} rumah tidak memiliki perubahan terdeteksi.` },
                  { key: "K2", label: "K2 — Perubahan sedang", sub: "1–2 jenis", color: "#F59E0B", desc: `${klasterCounts["K2"] ?? 0} rumah mengalami 1–2 jenis perubahan.` },
                  { key: "K3", label: "K3 — Perubahan signifikan", sub: "3+ jenis", color: "#EF4444", desc: `${klasterCounts["K3"] ?? 0} rumah mengalami 3 atau lebih jenis perubahan.` },
                ].map((item) => {
                  const isActive = klasterFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setKlasterFilter(isActive ? null : item.key)}
                      className={[
                        "flex items-start gap-2.5 rounded-lg p-3 text-left border transition-all duration-150 w-full",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-muted-foreground/40",
                      ].join(" ")}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <div className={["text-xs font-semibold leading-tight", isActive ? "text-primary-foreground" : "text-foreground"].join(" ")}>
                          {item.label}
                        </div>
                        <div className={["text-[10px] mt-0.5", isActive ? "text-primary-foreground/70" : "text-muted-foreground"].join(" ")}>
                          ({item.sub})
                        </div>
                      </div>
                      <span className={["ml-auto font-mono text-sm font-bold", isActive ? "text-primary-foreground" : "text-foreground"].join(" ")}>
                        {klasterCounts[item.key] ?? 0}
                      </span>
                    </button>
                  );
                })}

                <div className="mt-2 pt-3 border-t">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Informasi Klaster
                  </p>
                  {klasterFilter ? (
                    <p className="text-xs text-foreground leading-relaxed">
                      {klasterFilter === "K1" && `${klasterCounts["K1"] ?? 0} rumah tidak memiliki perubahan terdeteksi.`}
                      {klasterFilter === "K2" && `${klasterCounts["K2"] ?? 0} rumah mengalami 1–2 jenis perubahan fisik.`}
                      {klasterFilter === "K3" && `${klasterCounts["K3"] ?? 0} rumah mengalami perubahan signifikan (≥3 jenis).`}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Klik klaster di atas untuk memfilter tampilan peta dan melihat detail distribusi.
                    </p>
                  )}
                  {klasterFilter && (
                    <button
                      onClick={() => setKlasterFilter(null)}
                      className="text-[10px] text-primary underline mt-2"
                    >
                      Tampilkan semua
                    </button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SMART MAP */}
          <TabsContent value="smart" className="m-0">
            {/* Filter bar */}
            <div className="px-4 pt-3 pb-2.5 border-b bg-muted/20 flex items-center gap-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                Filter
              </label>
              <Select value={dashSmartJenis} onValueChange={setDashSmartJenis}>
                <SelectTrigger className="h-8 text-sm w-64 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(JENIS_LABEL).map(([key, lbl]) => (
                    <SelectItem key={key} value={key}>{lbl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-destructive">{dashSmartTotal}</span>
                {" "}rumah terpengaruh
              </span>
            </div>

            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 min-w-0">
                <LeafletMapEngine
                  data={allHouses ?? []}
                  height="380px"
                  colorByField={dashSmartJenis}
                  colorMap={(v: boolean) => v ? "#EF4444" : "#9CA3AF"}
                  legend={[]}
                  popupContent={(h) => (
                    <div className="space-y-1">
                      <div className="font-bold text-sm">{h.namaKepalaKeluarga}</div>
                      <div className="text-xs text-muted-foreground">{h.id} · {h.rt} · {h.rw}</div>
                      <Badge
                        className="text-[10px]"
                        style={{
                          backgroundColor: (h as any)[dashSmartJenis] ? "#EF4444" : "#9CA3AF",
                          color: "white",
                        }}
                      >
                        {(h as any)[dashSmartJenis] ? JENIS_LABEL[dashSmartJenis] : "Tidak Ada Perubahan"}
                      </Badge>
                    </div>
                  )}
                />
              </div>

              {/* Sidebar Smart: per-RW breakdown — struktur sama dgn Tagging Location */}
              <div className="lg:w-60 xl:w-64 border-t lg:border-t-0 lg:border-l flex flex-col">
                {/* Header */}
                <div className="px-4 pt-3 pb-2 border-b">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {JENIS_LABEL[dashSmartJenis]} Per RW
                  </p>
                  <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                    Sorotan: Rumah yang mengalami {JENIS_LABEL[dashSmartJenis]?.toLowerCase()}
                  </p>
                </div>

                {/* Per-RW bars */}
                <div className="overflow-y-auto px-4 py-3 space-y-2.5 max-h-44">
                  {dashSmartPerRw.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Tidak ada data</p>
                  ) : (
                    dashSmartPerRw.map(({ rw, berubah, total }) => (
                      <div key={rw} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{rw}</span>
                          <span className="font-mono font-bold text-primary">{berubah}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: total > 0 ? `${(berubah / total) * 100}%` : "0%" }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground text-right">
                          {total > 0 ? ((berubah / total) * 100).toFixed(0) : 0}% dari {total}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Legenda */}
                <div className="border-t px-4 pt-3 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Legenda</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-primary" />
                      <span className="text-[11px] text-foreground">{JENIS_LABEL[dashSmartJenis]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted-foreground/30" />
                      <span className="text-[11px] text-foreground">Tidak Ada Perubahan</span>
                    </div>
                  </div>
                </div>

                {/* Smart Insight Per Filter */}
                <div className="border-t px-4 py-3 mt-auto">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
                    Smart Insight Per Filter
                  </p>
                  <p className="text-xs text-foreground leading-relaxed">
                    {dashSmartTotal} dari {(allHouses ?? []).length} rumah (
                    {(allHouses ?? []).length > 0
                      ? ((dashSmartTotal / (allHouses ?? []).length) * 100).toFixed(1)
                      : 0}%) mengalami {JENIS_LABEL[dashSmartJenis]?.toLowerCase()}.
                  </p>
                  <Link href="/smart-map" className="text-[10px] text-primary font-semibold flex items-center gap-1 hover:underline mt-2">
                    Buka Smart Map lengkap <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* PETA TAGGING LOCATION */}
          <TabsContent value="tagging" className="m-0">
            {/* Filter warna marker bar */}
            <div className="px-4 pt-3 pb-2.5 border-b bg-muted/20 flex items-center gap-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                Filter Warna Marker
              </label>
              <Select value={taggingMode} onValueChange={setTaggingMode}>
                <SelectTrigger className="h-8 text-sm w-56 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="luasBangunan">Luas Bangunan</SelectItem>
                  <SelectItem value="luasLahan">Luas Lahan</SelectItem>
                  <SelectItem value="jumlahLantai">Tingkatan Rumah</SelectItem>
                  <SelectItem value="jenisDinding">Jenis Dinding</SelectItem>
                  <SelectItem value="jenisPlafon">Jenis Plafon</SelectItem>
                  <SelectItem value="jeniLantai">Jenis Lantai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 min-w-0">
                <LeafletMapEngine
                  data={allHouses ?? []}
                  height="380px"
                  colorMap={(h: any) => TAGGING_MODES[taggingMode]?.colorFn(h) ?? "#9CA3AF"}
                  legend={[]}
                  popupContent={(h) => {
                    const color = TAGGING_MODES[taggingMode]?.colorFn(h) ?? "#9CA3AF";
                    const val = (() => {
                      if (taggingMode === "luasBangunan") return `${h.luasBangunan ?? "—"} m²`;
                      if (taggingMode === "luasLahan") return `${h.luasLahan ?? "—"} m²`;
                      if (taggingMode === "jumlahLantai") return `${h.jumlahLantai ?? "—"} Lantai`;
                      if (taggingMode === "jenisDinding") return h.jenisDinding ?? "—";
                      if (taggingMode === "jenisPlafon") return (h as any).jenisPlafon ?? "—";
                      if (taggingMode === "jeniLantai") return h.jeniLantai ?? "—";
                      return "—";
                    })();
                    return (
                      <div className="space-y-1">
                        <div className="font-bold text-sm">{h.namaKepalaKeluarga}</div>
                        <div className="text-xs text-muted-foreground">{h.id} · {h.rt} · {h.rw}</div>
                        <div
                          className="text-[10px] font-semibold rounded px-1.5 py-0.5 text-white inline-block mt-1"
                          style={{ backgroundColor: color }}
                        >
                          {TAGGING_MODES[taggingMode]?.label}: {val}
                        </div>
                      </div>
                    );
                  }}
                />
              </div>

              {/* Sidebar Tagging: per-RW + legend + insight */}
              <div className="lg:w-60 xl:w-64 border-t lg:border-t-0 lg:border-l flex flex-col">
                {/* Per-RW breakdown */}
                <div className="px-4 pt-3 pb-2 border-b">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {TAGGING_MODES[taggingMode]?.label} Per RW
                  </p>
                  <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                    Sorotan: {TAGGING_MODES[taggingMode]?.highlightLabel}
                  </p>
                </div>
                <div className="overflow-y-auto px-4 py-3 space-y-2.5 max-h-44">
                  {taggingPerRw.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Tidak ada data</p>
                  ) : (
                    taggingPerRw.map(({ rw, highlight, total }) => (
                      <div key={rw} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{rw}</span>
                          <span className="font-mono font-bold text-primary">{highlight}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: total > 0 ? `${(highlight / total) * 100}%` : "0%" }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground text-right">
                          {total > 0 ? ((highlight / total) * 100).toFixed(0) : 0}% dari {total}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Legenda */}
                <div className="border-t px-4 pt-3 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Legenda</p>
                  <div className="space-y-1.5">
                    {(TAGGING_MODES[taggingMode]?.legend ?? []).map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] text-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Smart Insight */}
                <div className="border-t px-4 py-3 mt-auto">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
                    Smart Insight Per Filter
                  </p>
                  <p className="text-xs text-foreground leading-relaxed">{taggingInsightText}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}

// ─── Shared pagination ──────────────────────────────────────────────────────

function TablePager({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/10">
      <span className="text-xs text-muted-foreground">Hal. {page} / {totalPages}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>Sebelumnya</Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Selanjutnya</Button>
      </div>
    </div>
  );
}

// ─── Tabel Seluruhnya — data mentah bangunan ─────────────────────────────────

function RawDataTable({ data, page, totalPages, onPageChange }: { data: any[]; page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-8 text-center text-xs sticky left-0 bg-muted/40">No.</TableHead>
              <TableHead className="text-xs min-w-[160px]">Nama KK</TableHead>
              <TableHead className="text-xs w-16">RT/RW</TableHead>
              <TableHead className="text-xs text-right w-24">L. Bangunan</TableHead>
              <TableHead className="text-xs text-right w-20">L. Lahan</TableHead>
              <TableHead className="text-xs w-20">Jml. Lantai</TableHead>
              <TableHead className="text-xs w-28">Jenis Lantai</TableHead>
              <TableHead className="text-xs w-36">Jenis Dinding</TableHead>
              <TableHead className="text-xs w-24">Jenis Atap</TableHead>
              <TableHead className="text-xs w-32">Jenis Plafon</TableHead>
              <TableHead className="text-xs w-28">Jenis Pagar</TableHead>
              <TableHead className="text-xs w-28">Kondisi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-10 text-muted-foreground text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-7 h-7 opacity-30" />
                    Tidak ada data yang ditemukan.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((h, i) => (
                <TableRow key={h.id}>
                  <TableCell className="text-center font-mono text-[11px] text-muted-foreground">{(page - 1) * 10 + i + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm leading-tight">{h.namaKepalaKeluarga}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{h.id}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {h.rt?.replace("RT ", "")} / {h.rw?.replace("RW ", "")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {h.luasBangunan ? <>{h.luasBangunan} <span className="text-muted-foreground">m²</span></> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {h.luasLahan ? <>{h.luasLahan} <span className="text-muted-foreground">m²</span></> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-center">{h.jumlahLantai ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs">{h.jeniLantai ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs">{h.jenisDinding ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs">{h.jenisAtap ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs">{(h as any).jenisPlafon ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs">{h.pagar ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs">{h.kondisiBangunan ?? <span className="text-muted-foreground">—</span>}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <TablePager page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

// ─── Tabel Perubahan — indikator & klaster ───────────────────────────────────

const CHANGE_COLS = [
  { key: "perubahanPagar",        short: "Pagar" },
  { key: "perubahanLuasBangunan", short: "L.Bangunan" },
  { key: "perubahanLuasLahan",    short: "L.Lahan" },
  { key: "perubahanJumlahLantai", short: "Jml.Lantai" },
] as const;

function ChangesTable({ data, page, totalPages, onPageChange }: { data: any[]; page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-8 text-center text-xs">No.</TableHead>
              <TableHead className="text-xs min-w-[160px]">Nama KK</TableHead>
              <TableHead className="text-xs w-16">RT/RW</TableHead>
              <TableHead className="text-xs w-20 text-center">Klaster</TableHead>
              {CHANGE_COLS.map((c) => (
                <TableHead key={c.key} className="text-xs text-center w-24">{c.short}</TableHead>
              ))}
              <TableHead className="text-xs text-center w-20">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4 + CHANGE_COLS.length + 1} className="text-center py-10 text-muted-foreground text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-7 h-7 opacity-30" />
                    Tidak ada data yang ditemukan.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((h, i) => {
                const total = CHANGE_COLS.filter((c) => h[c.key]).length;
                return (
                  <TableRow key={h.id} className="bg-destructive/[0.02]">
                    <TableCell className="text-center font-mono text-[11px] text-muted-foreground">{(page - 1) * 10 + i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm leading-tight">{h.namaKepalaKeluarga}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{h.id}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {h.rt?.replace("RT ", "")} / {h.rw?.replace("RW ", "")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px]"
                        style={{ color: klasterColor(h.klaster), borderColor: klasterColor(h.klaster) }}
                      >
                        {h.klaster}
                      </Badge>
                    </TableCell>
                    {CHANGE_COLS.map((c) => (
                      <TableCell key={c.key} className="text-center">
                        {h[c.key] ? (
                          <Check className="w-4 h-4 text-destructive mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/30 text-sm">—</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: total >= 3 ? "#EF4444" : total >= 1 ? "#F59E0B" : "#22C55E" }}
                      >
                        {total}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <TablePager page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-36 flex-1" />
        </div>
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
      <Skeleton className="h-[380px] rounded-lg" />
      <Skeleton className="h-[480px] rounded-lg" />
    </div>
  );
}
