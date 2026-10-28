import type { Metadata } from "next";

import PageMasthead from "@/components/site/PageMasthead";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import {
  MODEL_CREDITS,
  PANORAMA_CREDITS,
  PHOTO_CREDITS,
  SOFTWARE_CREDITS,
  type AssetCredit,
} from "@/lib/credits";
import { prisma } from "@/lib/db";
import { formatBytes } from "@/lib/model-upload";

// The register is content, but uploads arrive from the Studio at any time.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Credits",
  description:
    "Every photograph, panorama, 3D scan and piece of software behind Dharohar, with its source and licence.",
  alternates: { canonical: "/credits" },
};

function AssetTable({ rows, label }: { rows: AssetCredit[]; label: string }) {
  return (
    <div className="mt-6 overflow-x-auto border border-ink/12 bg-paper">
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="border-b border-ink/15 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            <th scope="col" className="px-4 py-3 font-normal">
              File
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Work
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Source
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Licence
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.file} className="border-b border-ink/10 align-top last:border-0">
              <td className="px-4 py-3 font-mono text-[11px] leading-relaxed break-all text-ink-soft">
                {row.file}
              </td>
              <td className="px-4 py-3 leading-relaxed">{row.work}</td>
              <td className="px-4 py-3 leading-relaxed">
                <a
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-oxblood underline decoration-oxblood/30 underline-offset-2 transition-colors hover:decoration-oxblood"
                >
                  {row.source}
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-ink-soft">
                {row.licence}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CreditsPage() {
  const uploaded = await prisma.modelAsset.findMany({
    where: { exhibit: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      size: true,
      draco: true,
      credit: true,
      exhibit: { select: { title: true, slug: true } },
    },
  });

  return (
    <>
      <SiteHeader />
      <PageMasthead
        eyebrow="Sources and licences"
        title="Credits"
        lede="Dharohar is a fictional museum. The photographs, panoramas and 3D files are real, openly licensed stand-ins for objects the collection has not photographed or scanned yet — each one is named below with its source and licence."
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <section className="mt-12 border-l-2 border-oxblood bg-paper px-5 py-4 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-oxblood">
            What is a stand-in
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            None of the six objects described on the site exists in this form, and
            no file here is a scan of the object it sits beside. The 3D models are
            scans of comparable museum pieces; the photographs are of comparable
            objects; the panoramas are of other museums. Each exhibit page says so
            next to its viewer. When a real object is photographed or scanned, its
            row below is replaced and the note comes off the page.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-3xl tracking-tight">3D models</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Four files, all CC0. Three are exhibit stand-ins; the vase is the
            AR probe at <code className="font-mono text-[12px]">/spike/ar</code>.
          </p>
          <AssetTable rows={MODEL_CREDITS} label="3D model credits" />
        </section>

        {uploaded.length > 0 ? (
          <section className="mt-14">
            <h2 className="font-serif text-3xl tracking-tight">Uploaded models</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
              Scans added from the Studio after launch. They are stored in the
              database and served from{" "}
              <code className="font-mono text-[12px]">/api/models/…</code>; the
              source line is the one the curator typed when uploading, and it is
              the record a licence question is answered from.
            </p>

            <div className="mt-6 overflow-x-auto border border-ink/12 bg-paper">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <caption className="sr-only">Uploaded model credits</caption>
                <thead>
                  <tr className="border-b border-ink/15 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                    <th scope="col" className="px-4 py-3 font-normal">
                      File
                    </th>
                    <th scope="col" className="px-4 py-3 font-normal">
                      Exhibit
                    </th>
                    <th scope="col" className="px-4 py-3 font-normal">
                      Size
                    </th>
                    <th scope="col" className="px-4 py-3 font-normal">
                      Source and licence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uploaded.map((asset) => (
                    <tr
                      key={asset.id}
                      className="border-b border-ink/10 align-top last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] leading-relaxed break-all text-ink-soft">
                        {asset.filename}
                      </td>
                      <td className="px-4 py-3 leading-relaxed">
                        <a
                          href={`/exhibits/${asset.exhibit.slug}`}
                          className="text-oxblood underline decoration-oxblood/30 underline-offset-2 transition-colors hover:decoration-oxblood"
                        >
                          {asset.exhibit.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-ink-soft">
                        {formatBytes(asset.size)}
                        {asset.draco ? " · Draco" : ""}
                      </td>
                      <td className="px-4 py-3 leading-relaxed">
                        {asset.credit ?? (
                          <span className="text-oxblood">
                            No source recorded — add one in the Studio.
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="mt-14">
          <h2 className="font-serif text-3xl tracking-tight">Room panoramas</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Two equirectangular photographs, both CC0. They are not the rooms
            described on the site; the room pages say so under the viewer. Object
            markers are placed by hand on the image, not measured with a laser.
          </p>
          <AssetTable rows={PANORAMA_CREDITS} label="Panorama credits" />
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-3xl tracking-tight">Exhibit photography</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Six public-domain or openly licensed photographs of comparable
            objects, one per exhibit card.
          </p>
          <AssetTable rows={PHOTO_CREDITS} label="Photography credits" />
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-3xl tracking-tight">What was changed</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Licences that require attribution also require that changes are
            stated. Three kinds of change were made, all mechanical:
          </p>
          <ul className="mt-5 space-y-3 border-l border-ink/15 pl-5 text-sm leading-relaxed">
            <li>
              <span className="font-medium">Photographs</span> were padded onto a
              1200×900 chalk-grey plate (contained, never cropped) and saved as
              JPEG at quality 84, so the six cards read as one catalogue and no
              object is cut off.
            </li>
            <li>
              <span className="font-medium">Panoramas</span> were resized from
              8192×4096 tonemapped JPGs to 3072×1536 WebP, which keeps the seams
              and the carved detail on a projector while letting a phone decode
              them without a long wait.
            </li>
            <li>
              <span className="font-medium">3D models</span> were welded, pruned,
              Draco-compressed and given WebP textures — 16.5 MB of source files
              became 1.7 MB. The geometry and the scan detail are unchanged; the
              compression is the reason the site ships a Draco decoder at{" "}
              <code className="font-mono text-[12px]">/draco/</code>.
            </li>
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-3xl tracking-tight">Software</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The stack, in the order a request meets it. Versions are the ones in
            <code className="ml-1 font-mono text-[12px]">package.json</code> at the
            time of writing.
          </p>
          <div className="mt-6 overflow-x-auto border border-ink/12 bg-paper">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <caption className="sr-only">Software credits</caption>
              <thead>
                <tr className="border-b border-ink/15 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                  <th scope="col" className="px-4 py-3 font-normal">
                    Project
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Version
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Used for
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Licence
                  </th>
                </tr>
              </thead>
              <tbody>
                {SOFTWARE_CREDITS.map((row) => (
                  <tr key={row.name} className="border-b border-ink/10 align-top last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-oxblood underline decoration-oxblood/30 underline-offset-2 transition-colors hover:decoration-oxblood"
                      >
                        {row.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-ink-soft">
                      {row.version}
                    </td>
                    <td className="px-4 py-3 leading-relaxed text-ink-soft">{row.role}</td>
                    <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-ink-soft">
                      {row.licence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-14 max-w-2xl border-t border-ink/15 pt-6 text-sm leading-relaxed text-ink-soft">
          The full register, including the reasoning behind each substitution, is
          kept in{" "}
          <code className="font-mono text-[12px]">docs/CREDITS.md</code>. A licence
          question about any file here can be answered from that file and the
          source link above it.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
