import {
  FileText,
  Database,
  MapPin,
  Calendar,
  Users,
  Target,
  CheckCircle2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

type MetadataVariable = {
  nama: string;
  deskripsi: string;
  tipe: string;
  nilaiValid: string | null;
};

type HousingMetadata = {
  namaDataset: string;
  periodeData: string;
  sumberData: string;
  unitObservasi: string;
  cakupanWilayah: string;
  jumlahObservasi: number;
  informasiKoordinat: string;
  keteranganIndikator: string;
  variabel: MetadataVariable[];
};

/*
 * METADATA LOKAL TAPO
 * Data diambil dari metadata asli endpoint Tapo.
 * Tidak lagi bergantung pada API Replit.
 */
const metadata: HousingMetadata = {
  namaDataset: "Pendataan Lengkap Perumahan Kelurahan Lagaligo",

  periodeData: "2026",

  sumberData:
    "Pemerintah Kelurahan Lagaligo, Kecamatan Wara Timur, Kota Palopo",

  unitObservasi: "Bangunan/Rumah Tangga",

  cakupanWilayah:
    "Kelurahan Lagaligo, Kecamatan Wara Timur, Kota Palopo, sulawesi selatan",

  jumlahObservasi: 105,

  informasiKoordinat:
    "Koordinat GPS (WGS84 — Decimal Degrees). Lat ≈ -2.97 hingga -2.99, Lng ≈ 120.19. Catatan: koordinat saat ini adalah representatif hasil survei pendataan lengkap perumahan.",

  keteranganIndikator:
    "Terdapat 7 indikator perubahan yang didata: Pagar, Luas Bangunan, Jumlah Lantai, Jenis Lantai, Jenis Dinding, Luas Lahan, dan Jenis Atap. Status perubahan (berubah/tidak berubah) diturunkan secara otomatis dari ketujuh indikator tersebut.",

  variabel: [
    {
      nama: "ID Rumah",
      deskripsi: "Kode unik setiap rumah",
      tipe: "String",
      nilaiValid: "B-001 s/d B-050",
    },
    {
      nama: "Nomor Urut",
      deskripsi: "Nomor urut pendataan",
      tipe: "Integer",
      nilaiValid: "1 s/d n",
    },
    {
      nama: "Nama Kepala Keluarga",
      deskripsi: "Nama KK sesuai dokumen pendataan",
      tipe: "String",
      nilaiValid: null,
    },
    {
      nama: "Alamat",
      deskripsi: "Alamat lengkap bangunan",
      tipe: "String",
      nilaiValid: null,
    },
    {
      nama: "RT",
      deskripsi: "Rukun Tetangga",
      tipe: "String",
      nilaiValid: "RT 01 — RT 06",
    },
    {
      nama: "RW",
      deskripsi: "Rukun Warga",
      tipe: "String",
      nilaiValid: "RW 01 — RW 03",
    },
    {
      nama: "Luas Bangunan",
      deskripsi: "Luas bangunan dalam meter persegi",
      tipe: "Number (m²)",
      nilaiValid: null,
    },
    {
      nama: "Luas Lahan",
      deskripsi: "Luas lahan dalam meter persegi",
      tipe: "Number (m²)",
      nilaiValid: null,
    },
    {
      nama: "Jenis Lantai",
      deskripsi: "Material lantai bangunan",
      tipe: "Kategori",
      nilaiValid: "Semen, Keramik, Marmer/Granit, Kayu",
    },
    {
      nama: "Jenis Dinding",
      deskripsi: "Material dinding bangunan",
      tipe: "Kategori",
      nilaiValid: "Tembok, Kayu, Bambu, Seng",
    },
    {
      nama: "Jumlah Lantai",
      deskripsi: "Jumlah lantai bangunan",
      tipe: "Integer",
      nilaiValid: "1, 2",
    },
    {
      nama: "Jenis Atap",
      deskripsi: "Material atap bangunan",
      tipe: "Kategori",
      nilaiValid: "Genteng, Seng, Asbes",
    },
    {
      nama: "Pagar",
      deskripsi: "Keberadaan dan jenis pagar",
      tipe: "Kategori",
      nilaiValid: "Ada (Tembok), Ada (Kayu), Tidak Ada",
    },
    {
      nama: "Kondisi Bangunan",
      deskripsi: "Kondisi fisik bangunan secara umum",
      tipe: "Kategori",
      nilaiValid: "Baik, Rusak Ringan, Rusak Berat",
    },
    {
      nama: "Status Perubahan",
      deskripsi:
        "Apakah bangunan mengalami perubahan dari kondisi awal",
      tipe: "Biner",
      nilaiValid: "berubah, tidak_berubah",
    },
    {
      nama: "Klaster",
      deskripsi:
        "Pengelompokan berdasarkan jumlah jenis perubahan (K1=0, K2=1-2, K3≥3)",
      tipe: "Kategori",
      nilaiValid: "K1, K2, K3",
    },
    {
      nama: "Perubahan Pagar",
      deskripsi: "Indikator perubahan pada pagar",
      tipe: "Boolean",
      nilaiValid: "true, false",
    },
    {
      nama: "Perubahan Luas Bangunan",
      deskripsi: "Indikator perubahan pada luas bangunan",
      tipe: "Boolean",
      nilaiValid: "true, false",
    },
    {
      nama: "Perubahan Jumlah Lantai",
      deskripsi: "Indikator perubahan pada jumlah lantai",
      tipe: "Boolean",
      nilaiValid: "true, false",
    },
    {
      nama: "Perubahan Jenis Lantai",
      deskripsi: "Indikator perubahan pada jenis lantai",
      tipe: "Boolean",
      nilaiValid: "true, false",
    },
    {
      nama: "Perubahan Jenis Dinding",
      deskripsi: "Indikator perubahan pada jenis dinding",
      tipe: "Boolean",
      nilaiValid: "true, false",
    },
    {
      nama: "Perubahan Luas Lahan",
      deskripsi: "Indikator perubahan pada luas lahan",
      tipe: "Boolean",
      nilaiValid: "true, false",
    },
    {
      nama: "Perubahan Jenis Atap",
      deskripsi: "Indikator perubahan pada jenis atap",
      tipe: "Boolean",
      nilaiValid: "true, false",
    },
  ],
};

export default function Metadata() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          Metadata Dataset
        </h1>

        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
          Informasi & Struktur Data Sistem
        </p>
      </div>

      {/* Informasi Dataset */}
      <Card className="shadow-sm border-border bg-card overflow-hidden">

        <div className="h-2 w-full bg-primary" />

        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            {metadata.namaDataset}
          </CardTitle>

          <CardDescription>
            Detail teknis dan ruang lingkup dataset perumahan.
          </CardDescription>
        </CardHeader>

        <CardContent>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Periode */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                Periode Data
              </div>

              <div className="font-medium">
                {metadata.periodeData}
              </div>
            </div>

            {/* Sumber */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Database className="w-3.5 h-3.5" />
                Sumber Data
              </div>

              <div className="font-medium">
                {metadata.sumberData}
              </div>
            </div>

            {/* Unit */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5" />
                Unit Observasi
              </div>

              <div className="font-medium">
                {metadata.unitObservasi}
              </div>
            </div>

            {/* Cakupan */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                Cakupan Wilayah
              </div>

              <div className="font-medium">
                {metadata.cakupanWilayah}
              </div>
            </div>

            {/* Jumlah */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5" />
                Jumlah Observasi
              </div>

              <div className="font-medium text-lg font-mono text-primary">
                {metadata.jumlahObservasi.toLocaleString("id-ID")}{" "}
                <span className="text-sm text-foreground font-sans">
                  rumah
                </span>
              </div>
            </div>

            {/* Koordinat */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Info Koordinat
              </div>

              <div className="font-medium">
                {metadata.informasiKoordinat}
              </div>
            </div>

          </div>

          {/* Keterangan indikator */}
          {metadata.keteranganIndikator && (
            <div className="mt-6 p-4 bg-muted/30 rounded-md border border-muted-foreground/10 text-sm leading-relaxed">
              <span className="font-semibold block mb-1">
                Keterangan Indikator:
              </span>

              {metadata.keteranganIndikator}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Struktur Variabel */}
      <Card className="shadow-sm border-border">

        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle className="text-lg">
            Struktur Variabel
          </CardTitle>

          <CardDescription>
            Definisi dan format data yang tersedia dalam dataset.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">

          <Table>

            <TableHeader className="bg-muted/30">
              <TableRow>

                <TableHead className="w-[200px]">
                  Nama Variabel
                </TableHead>

                <TableHead>
                  Deskripsi
                </TableHead>

                <TableHead className="w-[120px]">
                  Tipe
                </TableHead>

                <TableHead className="w-[300px]">
                  Nilai Valid
                </TableHead>

              </TableRow>
            </TableHeader>

            <TableBody>

              {metadata.variabel.map((v, i) => (
                <TableRow key={i}>

                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {v.nama}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {v.deskripsi}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] bg-muted/50"
                    >
                      {v.tipe}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs">

                    {v.nilaiValid ? (
                      <div className="text-muted-foreground">
                        {v.nilaiValid}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 italic">
                        —
                      </span>
                    )}

                  </TableCell>

                </TableRow>
              ))}

            </TableBody>

          </Table>

        </CardContent>
      </Card>

    </div>
  );
}
