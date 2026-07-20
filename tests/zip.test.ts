import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { describe, expect, it } from "vitest";
import { filesFromSelection, importZip } from "../src/mcf/zip";

describe("hostile browser imports", () => {
  it("rejects archive traversal before extraction", async () => {
    const output = new BlobWriter("application/zip");
    const writer = new ZipWriter(output);
    await writer.add("../manifest.yaml", new TextReader("mcf: '1.0'"));
    await writer.close();
    const file = new File([await output.getData()], "unsafe.zip", { type: "application/zip" });
    await expect(importZip(file)).rejects.toThrow(/escapes|Unsafe/);
  });

  it("rejects executable and script extensions from manual selection", async () => {
    await expect(filesFromSelection([new File(["alert(1)"], "lesson.js")])).rejects.toThrow(
      /unsupported file type/,
    );
  });
});
