// El publicador de artifacts rechaza el carácter U+FFFD literal, que aparece
// dentro de cadenas de algunas librerías. Se escribe como la secuencia
// equivalente "�", que en JavaScript significa exactamente lo mismo.
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../../out-demo/app.js", import.meta.url);
const source = readFileSync(file, "utf8");
const count = source.split("�").length - 1;
writeFileSync(file, source.replaceAll("�", "\\uFFFD"));
console.log(`U+FFFD escapados: ${count}`);
