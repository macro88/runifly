type XmlPrimitive = string | number;
type XmlValue = XmlPrimitive | XmlNode | XmlValue[];
type XmlNode = { [key: string]: XmlValue };

type GpxPoint = {
  lat: number;
  lon: number;
  ele: number;
};

type GpxTrack = {
  name: string;
  trkseg: {
    trkpt: GpxPoint[];
  };
};

type GpxJson = {
  metadata?: unknown;
  wpt?: unknown;
  rte?: unknown[];
  trk: GpxTrack[];
};

/**
 * xml2js parseNumbers. Integers stay integers (`1.0` → 1); other numerics
 * become floats. Non-numeric text is left alone.
 */
function parseNumbers(value: string): XmlPrimitive {
  if (Number.isNaN(Number(value))) return value;
  return Number(value) % 1 === 0 ? parseInt(value, 10) : parseFloat(value);
}

/** explicitArray: false — one child stays a value, the next of the same name makes an array. */
function assignOrPush(obj: XmlNode, key: string, value: XmlValue): void {
  if (!(key in obj)) {
    obj[key] = value;
    return;
  }
  const current = obj[key];
  if (Array.isArray(current)) {
    current.push(value);
    return;
  }
  obj[key] = [current, value];
}

function childElements(el: Element): Element[] {
  const children: Element[] = [];
  for (let i = 0; i < el.childNodes.length; i += 1) {
    const node = el.childNodes[i];
    if (node.nodeType === 1) children.push(node as Element);
  }
  return children;
}

function textContent(el: Element): string {
  let text = "";
  for (let i = 0; i < el.childNodes.length; i += 1) {
    const node = el.childNodes[i];
    if (node.nodeType === 3 || node.nodeType === 4) {
      text += node.nodeValue ?? "";
    }
  }
  return text;
}

function elementName(el: Element): string {
  return String(parseNumbers(el.localName || el.nodeName));
}

/**
 * One element, in the shape xml2js built with mergeAttrs, trim, and
 * explicitArray: false. A single trkpt stays an object; two become an array.
 * Whitespace-only text is kept only when the element has nothing else.
 */
function elementContents(el: Element): XmlValue {
  const obj: XmlNode = {};
  const attributes = el.attributes;
  for (let i = 0; i < attributes.length; i += 1) {
    const attr = attributes.item(i);
    if (!attr) continue;
    assignOrPush(
      obj,
      String(parseNumbers(attr.localName || attr.name)),
      parseNumbers(attr.value)
    );
  }

  const children = childElements(el);
  const text = textContent(el);
  const onlyWhitespace = /^\s*$/.test(text);
  if (!onlyWhitespace) {
    const processed = parseNumbers(text.trim());
    if (Object.keys(obj).length === 0 && children.length === 0) {
      return processed;
    }
    obj._ = processed;
  } else if (Object.keys(obj).length === 0 && children.length === 0) {
    return text;
  }

  for (const child of children) {
    assignOrPush(obj, elementName(child), elementContents(child));
  }
  return obj;
}

function parseGpxXml(xml: string): { gpx: XmlValue } {
  if (xml.trim() === "") {
    throw new Error("Invalid GPX");
  }
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  if (
    root == null ||
    root.localName === "parsererror" ||
    root.getElementsByTagName("parsererror").length > 0
  ) {
    throw new Error("Invalid GPX");
  }
  const name = root.localName || root.nodeName;
  return { [name]: elementContents(root) } as { gpx: XmlValue };
}

export default class GpxParser {
  async parse(gpxstring: string): Promise<GpxJson> {
    const jsonReturn = {} as GpxJson;
    try {
      const result = parseGpxXml(gpxstring);
      const gpx = result.gpx as {
        metadata?: GpxJson["metadata"];
        wpt?: GpxJson["wpt"];
        rte?: unknown;
        trk?: GpxTrack | GpxTrack[];
      };
      jsonReturn.metadata = gpx.metadata;
      jsonReturn.wpt = gpx.wpt;
      if (gpx.rte) {
        jsonReturn.rte = Array.isArray(gpx.rte) ? gpx.rte : [gpx.rte];
      }
      jsonReturn.trk = Array.isArray(gpx.trk) ? gpx.trk : [gpx.trk as GpxTrack];
    } catch (e) {
      console.error(e);
    }
    return jsonReturn;
  }
}
