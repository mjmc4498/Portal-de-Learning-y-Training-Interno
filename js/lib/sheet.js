/* xlsx.js (C) 2013-present SheetJS -- http://sheetjs.com */
var DO_NOT_EXPORT_CODEPAGE=true;
/*<shim>*/
if(typeof require !== 'undefined') {
	if(typeof cptable === 'undefined') cptable = require('codepage');
	if(typeof jszip === 'undefined') jszip = require('jszip');
	if(typeof crc32 === 'undefined') crc32 = require('crc-32');
	if(typeof adler32 === 'undefined') adler32 = require('adler-32');
}
/*</shim>*/
var ODS = {};
(function(ODS) {
var ns = {
	"dc": "http://purl.org/dc/elements/1.1/",
	"calcext": "urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0",
	"loext": "urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0",
	"ooo": "http://openoffice.org/2004/office",
	"chartooo": "http://openoffice.org/2004/chart",
	"draw": "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
	"style": "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
	"chart": "urn:oasis:names:tc:opendocument:xmlns:chart:1.0",
	"form": "urn:oasis:names:tc:opendocument:xmlns:form:1.0",
	"table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
	"office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
	"text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
	"uof": "urn:uof:of",
	"表": "urn:uof:of",
	"字": "urn:uof:of",
	"manifest": "urn:oasis:names:tc:opendocument:xmlns:manifest:1.0",
	"meta": "urn:oasis:names:tc:opendocument:xmlns:meta:1.0",
	"number": "urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0",
	"presentation": "urn:oasis:names:tc:opendocument:xmlns:presentation:1.0",
	"svg": "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
	"dr3d": "urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0",
	"math": "http://www.w3.org/1998/Math/MathML",
	"script": "urn:oasis:names:tc:opendocument:xmlns:script:1.0",
	"dom": "http://www.w3.org/2001/xml-events",
	"xforms": "http://www.w3.org/2002/xforms",
	"xsd": "http://www.w3.org/2001/XMLSchema",
	"xsi": "http://www.w3.org/2001/XMLSchema-instance",
	"sheet": "urn:oasis:names:tc:opendocument:sh33tjs:1.0",
	"rpt": "http://openoffice.org/2005/report",
	"of": "urn:oasis:names:tc:opendocument:xmlns:of:1.2",
	"xhtml": "http://www.w3.org/1999/xhtml",
	"grddl": "http://www.w3.org/2003/g/data-view#",
	"tableooo": "http://openoffice.org/2009/table",
	"drawooo": "http://openoffice.org/2010/draw",
	"calcext": "urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0",
	"loext": "urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0",
	"field": "urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0",
	"formx": "urn:openoffice:names:experimental:ooxml-odf-interop:xmlns:form:1.0",
	"css3t": "http://www.w3.org/TR/css3-text/"
};
ns.rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
ns.gn = "http://www.gnome.org/gnumeric/let-there-be-gnumeric/1.12";
ns.go = "http://www.gnome.org/gnumeric/let-there-be-gnumeric/1.12";
var ods_manifest_type = "application/vnd.oasis.opendocument.spreadsheet";
function parse_manifest(data, opts) {
	var d = xlml_normalize(data);
	var str = xlml_parse_str(d, "<manifest:manifest", "</manifest:manifest>");
	var ss = {}, sf = {};
	var s = str.match(/<manifest:file-entry[^>]*>/g);
	if(s) for(var i = 0; i < s.length; ++i) {
		var f = xlml_parse_attr(s[i]);
		switch(f["media-type"]) {
			case ods_manifest_type:
			case "application/vnd.sun.xml.calc":
				break;
			case "application/vnd.oasis.opendocument.spreadsheet-template": break;
			case "application/vnd.oasis.opendocument.graphics": break;
			case "application/vnd.oasis.opendocument.text": break;
			default:
				if(f.path.slice(-1) != '/') {
					var p = f.path.slice(f.path.lastIndexOf('/')+1);
					if(opts.WTF) ss[p] = f.path;
				}
		}
		sf[f.path] = f;
	}
	return [ss, sf];
}

function parse_rdf(data, sf) {
	var path = "", pth;
	var d = xlml_normalize(data);
	var str = xlml_parse_str(d, "<rdf:RDF", "</rdf:RDF>");
	(str.match(/<rdf:Description[^>]*>/g)||[]).forEach(function(m) {
		var f = xlml_parse_attr(m);
		if(f.about.slice(-1) == '/') {
			var kid = (m.match(/<ns0:hasPart[^>]*>/));
			if(kid) path = xlml_parse_attr(kid[0]).resource;
		}
	});
	if(path && sf[path]) switch(sf[path]["media-type"]) {
		case ods_manifest_type:
			break;
		default:
			throw new Error("ODS file not found: " + path);
	}
	return path;
}

function parse_meta_xml(data, opts) {
	var d = xlml_normalize(data);
	var str = xlml_parse_str(d, "<office:document-meta", "</office:document-meta>");
	var f = xlml_parse_str(str, "<office:meta>", "</office:meta>");
	var props = {};
	var p = parse_core_props(f, opts);
	if(p) props.Props = p;
	return props;
}

var ct_val_type = {
	"boolean": "b",
	"float": "n",
	"percentage": "n",
	"currency": "n",
	"date": "d",
	"time": "n",
	"string": "s",
	"text": "s"
};
var day_ms = 24*60*60*1000;
var odf_date = new Date(1899, 11, 30);
function ods_to_csf_time(val) {
	var res = val.match(/P(\d*Y)?(\d*M)?(\d*D)?T(\d*H)?(\d*M)?(\d*S)?/);
	if(!res) return 0;
	var secs = 0;
	for(var i=1; i!=res.length; ++i) {
		if(!res[i]) continue;
		var t = 1;
		if(i > 3) {
			switch(res[i].slice(res[i].length-1)) {
				case 'H': t *= 60;
				case 'M': t *= 60;
				case 'S': break;
			}
		} else {
			throw new Error("Unsupported ODS Duration Field: " + res[i].slice(res[i].length-1));
		}
		secs += t * parseInt(res[i],10);
	}
	return secs;
}

function parse_content_xml(data, opts) {
	var d = xlml_normalize(data);
	var str = xlml_parse_str(d, "<office:body>", "</office:body>");
	str = xlml_parse_str(str, "<office:spreadsheet>", "</office:spreadsheet>");
	var sheets = {};
	var s, sn, sf;
	var tbls = str.match(/<table:table[^>]*>/g);
	if(!tbls) throw new Error("Could not find table:table");
	for(var i = 0; i < tbls.length; ++i) {
		var t = xlml_parse_attr(tbls[i]);
		if(!t.name) throw new Error("table:table missing table:name: " + tbls[i]);
		var end = str.indexOf("</table:table>", str.indexOf(tbls[i]));
		var d = str.slice(str.indexOf('>', str.indexOf(tbls[i]))+1, end);
		var ws = parse_ws(d, t.name, i, opts);
		sheets[t.name] = ws;
	}
	return sheets;
}

function parse_ws(d, name, idx, opts) {
	var o = opts || {};
	var ws = o.dense ? [] : {};
	var d_cols = d.match(/<table:table-column[^>]*>/g);
	var d_rows = d.match(/<table:table-row[^>]*>/g);
	var cidx = 0;
	var R = 0, C = 0, range = {s: {r:2000000, c:2000000}, e: {r:0, c:0}};
	var cols = [], cstyle, p;
	if(d_cols) for(C = 0; C < d_cols.length; ++C) {
		p = xlml_parse_attr(d_cols[C]);
		var repe = +p['number-columns-repeated'] || 1;
		for(var i = 0; i < repe; ++i) {
			cols.push({width: +p['column-width']});
		}
	}
	for(R = 0; R < d_rows.length; ++R) {
		var row = xlml_parse_attr(d_rows[R]);
		var repe = +row['number-rows-repeated'] || 1;
		var row_hidden = (row.visibility||"visible") == "collapse";
		var cells = d.slice(d.indexOf(d_rows[R])+d_rows[R].length, d.indexOf("</table:table-row>", d.indexOf(d_rows[R])));
		var cells_a = cells.match(/<table:table-cell[^>]*>|<table:covered-table-cell[^>]*\/>/g) || [];
		var c_crepe = 0;
		for(C = 0; C < cells_a.length; ++C) {
			var cell = xlml_parse_attr(cells_a[C]);
			var crep = +cell['number-columns-repeated'] || 1;
			if(cells_a[C].slice(0,24) == '<table:covered-table-cell') {
				for(var j=0; j<crep; ++j) {
					if(o.sheetStubs) {
						var zcell = {t:'z'};
						if(o.dense) { if(!ws[R]) ws[R] = []; ws[R][C+c_crepe+j] = zcell; }
						else ws[encode_cell({r:R,c:C+c_crepe+j})] = zcell;
					}
				}
				c_crepe += crep-1;
				continue;
			}
			var end = cells.indexOf("</table:table-cell>", cells.indexOf(cells_a[C]));
			var d_cell = cells.slice(cells.indexOf('>', cells.indexOf(cells_a[C]))+1, end);
			var textp = d_cell.match(/<text:p[^>]*>([^<]*)<\/text:p>/);
			var z = {t:'z', v: null};
			if(textp && textp[1]) {
				z.t = 's';
				z.v = unescapexml(textp[1]);
			}
			if(cell['value-type']) {
				z.t = ct_val_type[cell['value-type']] || 'z';
				if(cell.value != null) z.v = +cell.value;
				if(cell['boolean-value']) z.v = cell['boolean-value'] == 'true';
				if(z.t == 's' && cell['string-value']) z.v = cell['string-value'];
				if(z.t == 'd') {
					z.v = parseDate(cell['date-value']);
					if(!o.cellDates) { z.t = 'n'; z.v = datenum(z.v); }
					z.z = 'm/d/yy';
				}
				if(z.t == 'n' && cell['time-value']) {
					z.v = ods_to_csf_time(cell['time-value']) / day_ms;
					if(o.cellDates) { z.t = 'd'; z.v = numdate(z.v); }
					z.z = 'HH:MM:SS';
				}
			}
			if(o.cellFormula != false && cell.formula) z.f = unescapexml(cell.formula).slice(3, cell.formula.length-2);
			if(range.s.r > R) range.s.r = R;
			if(range.e.r < R) range.e.r = R;
			if(range.s.c > C+c_crepe) range.s.c = C+c_crepe;
			if(range.e.c < C+c_crepe) range.e.c = C+c_crepe;
			for(var j=0; j<crep; ++j) {
				if(o.dense) { if(!ws[R]) ws[R] = []; ws[R][C+c_crepe+j] = (j==0 ? z : dup(z)); }
				else ws[encode_cell({r:R,c:C+c_crepe+j})] = (j==0 ? z : dup(z));
			}
			c_crepe += crep-1;
		}
	}
	if(range.s.r <= range.e.r && range.s.c <= range.e.c) ws['!ref'] = encode_range(range);
	if(o.sheetRows) ws['!ref'] = encode_range(range.s, {r:o.sheetRows-1, c:range.e.c});
	return ws;
}

function parse_fods(data, opts) {
	var d = xlml_normalize(data);
	var str = xlml_parse_str(d, "<office:document>", "</office:document>");
	var body = xlml_parse_str(str, "<office:body>", "</office:body>");
	var content = xlml_parse_str(body, "<office:spreadsheet>", "</office:spreadsheet>");
	var sheets = {};
	var s, sn, sf;
	var tbls = content.match(/<table:table[^>]*>/g);
	if(!tbls) throw new Error("Could not find table:table");
	for(var i = 0; i < tbls.length; ++i) {
		var t = xlml_parse_attr(tbls[i]);
		if(!t.name) throw new Error("table:table missing table:name: " + tbls[i]);
		var end = content.indexOf("</table:table>", content.indexOf(tbls[i]));
		var d = content.slice(content.indexOf('>', content.indexOf(tbls[i]))+1, end);
		var ws = parse_ws(d, t.name, i, opts);
		sheets[t.name] = ws;
	}
	return sheets;
}

function parse_ods(zip, opts) {
	var manifest = parse_manifest(getzipstr(zip, "META-INF/manifest.xml", true), opts);
	var content_path = parse_rdf(getzipstr(zip, "manifest.rdf", true), manifest[1]) || "content.xml";
	var sheets = parse_content_xml(getzipstr(zip, content_path, true), opts);
	var props = parse_meta_xml(getzipstr(zip, "meta.xml", true), opts);
	return [sheets, props];
}

function write_manifest(manifest, opts) {
	var o = [XML_HEADER, '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">\n'];
	o.push('  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="' + ods_manifest_type + '"/>\n');
	for(var i=0; i<manifest.length; ++i) o.push('  <manifest:file-entry manifest:full-path="' + manifest[i][0] + '" manifest:media-type="' + manifest[i][1] + '"/>\n');
	o.push("</manifest:manifest>");
	return o.join("");
}

function write_rdf_desc(path, type, ispkg) {
	return [
		'  <rdf:Description rdf:about="' + path + '">\n',
		'    <rdf:type rdf:resource="http://docs.oasis-open.org/ns/office/1.2/meta/' + (ispkg ? "pkg" : "odf") + '#' + type + '"/>\n',
		"  </rdf:Description>\n"
	];
}
function write_rdf_haspart(path, resource) {
	return [
		'  <rdf:Description rdf:about="' + path + '">\n',
		'    <ns0:hasPart xmlns:ns0="http://docs.oasis-open.org/ns/office/1.2/meta/pkg#" rdf:resource="' + resource + '"/>\n',
		"  </rdf:Description>\n"
	];
}

function write_rdf(rdf) {
	var o = [XML_HEADER];
	o.push('<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n');
	for(var i = 0; i!= rdf.length; ++i) {
		o.push(write_rdf_desc(rdf[i][0], rdf[i][1]));
		o.push(write_rdf_haspart("", rdf[i][0]));
	}
	o.push(write_rdf_desc("","Document", "pkg"));
	o.push("</rdf:RDF>");
	return o.join("");
}

function write_meta() {
	return XML_HEADER + '<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.2"><office:meta><meta:generator>Sheet' + 'JS ' + XLSX.version + '</meta:generator></office:meta></office:document-meta>';
}

var write_styles_xml = (function() {
	var master_styles = [
		'<office:master-styles>',
		'<style:master-page style:name="mp1" style:page-layout-name="mp1">',
		'<style:header/>',
		'<style:header-left style:display="false"/>',
		'<style:footer/>',
		'<style:footer-left style:display="false"/>',
		'</style:master-page>',
		'</office:master-styles>'
	].join("");
	var doc_styles = '<office:document-styles ' + wxt_helper({
		"xmlns:office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
		"xmlns:table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
		"xmlns:style": "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
		"xmlns:text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
		"xmlns:draw": "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
		"xmlns:fo": "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
		"xmlns:xlink": "http://www.w3.org/1999/xlink",
		"xmlns:dc": "http://purl.org/dc/elements/1.1/",
		"xmlns:number": "urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0",
		"xmlns:svg": "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
		"xmlns:of": "urn:oasis:names:tc:opendocument:xmlns:of:1.2",
		"office:version": "1.2"
	}) + '>' + master_styles + '</office:document-styles>';

	return function wstyle() { return XML_HEADER + doc_styles; };
})();
var write_content_xml = (function(){
	var p1 = '<text:p>';
	var p2 = '</text:p>';
	var c1 = '          <table:table-cell';
	var c2 = '>\n';
	var c3 = '          </table:table-cell>\n';
	var r1 = '        <table:table-row>\n';
	var r2 = '        </table:table-row>\n';
	var t1 = '      <table:table table:name="';
	var t2 = '" table:style-name="ta1">\n';
	var t3 = '      </table:table>\n';

	var write_ws = function(ws, name, i, opts) {
		var o = [t1 + escapexml(name) + t2];
		var R=0, C=0, range = safe_decode_range(ws['!ref']), dense = Array.isArray(ws);
		var marr = ws['!merges'] || [], mi = 0;
		for(C=0; C<=range.e.c; ++C) o.push('        <table:table-column table:style-name="co1" table:default-cell-style-name="Default"/>\n');
		for(R=0; R<range.s.r; ++R) o.push(r1 + r2);
		for(; R<=range.e.r; ++R) {
			o.push(r1);
			for(C=0; C<range.s.c; ++C) o.push('          <table:table-cell />\n');
			for(; C<=range.e.c; ++C) {
				var skip = false, sp = {};
				for(mi = 0; mi != marr.length; ++mi) {
					if(marr[mi].s.c > C) continue;
					if(marr[mi].s.r > R) continue;
					if(marr[mi].e.c < C) continue;
					if(marr[mi].e.r < R) continue;
					if(marr[mi].s.c != C || marr[mi].s.r != R) skip = true;
					sp['table:number-columns-spanned'] = marr[mi].e.c - marr[mi].s.c + 1;
					sp['table:number-rows-spanned'] = marr[mi].e.r - marr[mi].s.r + 1;
					break;
				}
				if(skip) {o.push('          <table:covered-table-cell/>\n'); continue;}
				var ref = encode_cell({r:R,c:C});
				var cell = dense ? (ws[R]||[])[C] : ws[ref];
				if(!cell) { o.push('          <table:table-cell />\n'); continue; }
				var cv = "", v = cell.v, typ = "";
				if(cell.t == 'b') { cv = cell.v ? 'true' : 'false'; typ = 'boolean'; }
				else if(cell.t == 'n') { cv = cell.v; typ = 'float'; }
				else if(cell.t == 'd') {
					cv = cell.v.toISOString(); typ = 'date';
					sp['table:style-name'] = "ce1";
				} else { cv = cell.v; typ = 'string'; }
				var os = c1;
				sp['office:value-type'] = typ;
				if(typ == 'boolean') sp['office:boolean-value'] = cv;
				else if(typ != 'string') sp['office:value'] = cv;
				if(typ == 'date') sp['office:date-value'] = cv;
				if(cell.f) sp['table:formula'] = 'of:=' + escapexml(cell.f);
				if(typ == 'string') sp['office:string-value'] = cv;

				os += wxt_helper(sp);
				os += c2;
				os += p1 + (typ == 'string' ? escapexml(cv).replace(/ /g, '<text:s/>') : cv) + p2;
				os += c3;
				o.push(os);
			}
			o.push(r2);
		}
		o.push(t3);
		return o.join("");
	};

	return function write_content(wb, opts) {
		var o = [XML_HEADER];
		var p = {
			"xmlns:office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
			"xmlns:table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
			"xmlns:style": "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
			"xmlns:text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
			"xmlns:draw": "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
			"xmlns:fo": "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
			"xmlns:xlink": "http://www.w3.org/1999/xlink",
			"xmlns:dc": "http://purl.org/dc/elements/1.1/",
			"xmlns:meta": "urn:oasis:names:tc:opendocument:xmlns:meta:1.0",
			"xmlns:number": "urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0",
			"xmlns:presentation": "urn:oasis:names:tc:opendocument:xmlns:presentation:1.0",
			"xmlns:svg": "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
			"xmlns:chart": "urn:oasis:names:tc:opendocument:xmlns:chart:1.0",
			"xmlns:dr3d": "urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0",
			"xmlns:math": "http://www.w3.org/1998/Math/MathML",
			"xmlns:form": "urn:oasis:names:tc:opendocument:xmlns:form:1.0",
			"xmlns:script": "urn:oasis:names:tc:opendocument:xmlns:script:1.0",
			"xmlns:ooo": "http://openoffice.org/2004/office",
			"xmlns:ooow": "http://openoffice.org/2004/writer",
			"xmlns:oooc": "http://openoffice.org/2004/calc",
			"xmlns:dom": "http://www.w3.org/2001/xml-events",
			"xmlns:xforms": "http://www.w3.org/2002/xforms",
			"xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
			"xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
			"xmlns:sheet": "urn:oasis:names:tc:opendocument:sh33tjs:1.0",
			"xmlns:rpt": "http://openoffice.org/2005/report",
			"xmlns:of": "urn:oasis:names:tc:opendocument:xmlns:of:1.2",
			"xmlns:xhtml": "http://www.w3.org/1999/xhtml",
			"xmlns:grddl": "http://www.w3.org/2003/g/data-view#",
			"xmlns:tableooo": "http://openoffice.org/2009/table",
			"xmlns:drawooo": "http://openoffice.org/2010/draw",
			"xmlns:calcext": "urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0",
			"xmlns:loext": "urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0",
			"xmlns:field": "urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0",
			"xmlns:formx": "urn:openoffice:names:experimental:ooxml-odf-interop:xmlns:form:1.0",
			"xmlns:css3t": "http://www.w3.org/TR/css3-text/",
			"office:version": "1.2"
		};
		if(opts.bookType == 'fods') o.push('<office:document' + wxt_helper(p) + '>\n');
		else o.push('<office:document-content' + wxt_helper(p) + '>\n');
		o.push('  <office:automatic-styles>\n');
		o.push('  <number:date-style style:name="N37" number:automatic-order="true">\n');
		o.push('   <number:month number:style="long"/>\n');
		o.push('   <number:text>/</number:text>\n');
		o.push('   <number:day number:style="long"/>\n');
		o.push('   <number:text>/</number:text>\n');
		o.push('   <number:year/>\n');
		o.push('  </number:date-style>\n');
		o.push('  <style:style style:name="co1" style:family="table-column">\n');
		o.push('   <style:table-column-properties fo:break-before="auto" style:column-width="2.3cm"/>\n');
		o.push('  </style:style>\n');
		o.push('  <style:style style:name="ro1" style:family="table-row">\n');
		o.push('   <style:table-row-properties fo:break-before="auto" style:row-height="16.9pt"/>\n');
		o.push('  </style:style>\n');
		o.push('  <style:style style:name="ta1" style:family="table" style:master-page-name="mp1">\n');
		o.push('   <style:table-properties table:display="true" style:writing-mode="lr-tb"/>\n');
		o.push('  </style:style>\n');
		o.push('  <style:style style:name="ce1" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="N37"/>\n');
		o.push('  </office:automatic-styles>\n');
		o.push('  <office:body>\n');
		o.push('    <office:spreadsheet>\n');
		for(var i = 0; i != wb.SheetNames.length; ++i) o.push(write_ws(wb.Sheets[wb.SheetNames[i]], wb.SheetNames[i], i, opts));
		o.push('    </office:spreadsheet>\n');
		o.push('  </office:body>\n');
		if(opts.bookType == 'fods') o.push('</office:document>');
		else o.push('</office:document-content>');
		return o.join("");
	};
})();

function write_ods(wb, opts) {
	if(opts.bookType == 'fods') return write_content_xml(wb, opts);
	var zip = new jszip();
	var manifest = [], rdf = [];
	var content = write_content_xml(wb, opts);
	zip.file("content.xml", content);
	manifest.push(["content.xml", "text/xml"]);
	rdf.push(["content.xml", "ContentFile"]);

	var styles = write_styles_xml(wb, opts);
	zip.file("styles.xml", styles);
	manifest.push(["styles.xml", "text/xml"]);
	rdf.push(["styles.xml", "StylesFile"]);

	var meta = write_meta(wb, opts);
	zip.file("meta.xml", meta);
	manifest.push(["meta.xml", "text/xml"]);
	rdf.push(["meta.xml", "MetadataFile"]);

	zip.file("manifest.rdf", write_rdf(rdf));
	manifest.push(["manifest.rdf", "application/rdf+xml"]);

	zip.file("META-INF/manifest.xml", write_manifest(manifest, opts));
	zip.file("mimetype", ods_manifest_type);

	return zip;
}
ODS.parse = parse_ods;
ODS.parse_fods = parse_fods;
ODS.write = write_ods;
})(ODS);
if(typeof require !== 'undefined') {
	var cptable;
	if(typeof module !== 'undefined' && module.exports) {
		if(typeof jszip === 'undefined') jszip = require('jszip');
		if(typeof crc32 === 'undefined') crc32 = require('crc-32');
		if(typeof adler32 === 'undefined') adler32 = require('adler-32');
		cptable = require('codepage');
	}
}
var _fs, jszip;
if(typeof JSZip !== 'undefined') jszip = JSZip;
if (typeof exports !== 'undefined') {
	if (typeof module !== 'undefined' && module.exports) {
		if(typeof jszip === 'undefined') jszip = require('jszip');
	}
}
var XLSX = {};
(function(XLSX){
XLSX.version = '0.8.0';
var current_codepage = 1252, current_ansi = 1252;
if(typeof cptable !== 'undefined') {
	current_codepage = cptable.utils.decode(1252, ' ') == ' ' ? 1252 : 874;
	current_ansi = cptable.utils.decode(1252, ' ') == ' ' ? 1252 : 874;
}
function use_cp(cp) {
	current_codepage = cp;
	current_ansi = cp;
	if(typeof cptable !== 'undefined') {
		cptable.utils.cache.encache();
		cptable.utils.cache.decache();
		cptable.utils.set_cp(cp);
	}
}
function reset_cp() {
	if(typeof cptable !== 'undefined') {
		cptable.utils.cache.encache();
		cptable.utils.cache.decache();
		cptable.utils.set_cp(1252);
	}
	current_codepage = 1252;
	current_ansi = 1252;
}

function char_codes(data) {
	var o = [];
	for(var i = 0, len = data.length; i < len; ++i) o[i] = data.charCodeAt(i);
	return o;
}

function b64_encode(string) {
	var o = "";
	var c1, c2, c3, em1, em2, em3, em4;
	var i = 0;
	while (i < string.length) {
		c1 = string.charCodeAt(i++);
		c2 = string.charCodeAt(i++);
		c3 = string.charCodeAt(i++);
		em1 = c1 >> 2;
		em2 = ((c1 & 3) << 4) | (c2 >> 4);
		em3 = ((c2 & 15) << 2) | (c3 >> 6);
		em4 = c3 & 63;
		if (isNaN(c2)) {
			em3 = em4 = 64;
		} else if (isNaN(c3)) {
			em4 = 64;
		}
		o += b64_chr[em1] + b64_chr[em2] + b64_chr[em3] + b64_chr[em4];
	}
	return o;
}

var b64_chr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var b64_dec = (function(){
	var d = {}, i = 0, c = b64_chr;
	for(; i<c.length; ++i) d[c.charAt(i)] = i;
	return d;
})();

function b64_decode(string) {
	var o = "";
	var c1, c2, c3, em1, em2, em3, em4;
	var i = 0;
	string = string.replace(/[^\w\+\/\=]/g, "");
	while (i < string.length) {
		em1 = b64_dec[string.charAt(i++)];
		em2 = b64_dec[string.charAt(i++)];
		c1 = (em1 << 2) | (em2 >> 4);
		o += String.fromCharCode(c1);

		em3 = b64_dec[string.charAt(i++)];
		c2 = ((em2 & 15) << 4) | (em3 >> 2);
		if (em3 !== 64) {
			o += String.fromCharCode(c2);
		}

		em4 = b64_dec[string.charAt(i++)];
		c3 = ((em3 & 3) << 6) | em4;
		if (em4 !== 64) {
			o += String.fromCharCode(c3);
		}
	}
	return o;
}
XLSX.utils = {
	encode_col: encode_col,
	encode_row: encode_row,
	encode_cell: encode_cell,
	encode_range: encode_range,
	decode_col: decode_col,
	decode_row: decode_row,
	split_cell: split_cell,
	decode_cell: decode_cell,
	decode_range: decode_range,
	sheet_add_aoa: sheet_add_aoa,
	sheet_add_json: sheet_add_json,
	sheet_add_dom: sheet_add_dom,
	aoa_to_sheet: aoa_to_sheet,
	json_to_sheet: json_to_sheet,
	table_to_sheet: table_to_sheet,
	table_to_book: table_to_book,
	sheet_to_csv: sheet_to_csv,
	sheet_to_json: sheet_to_json,
	sheet_to_formulae: sheet_to_formulae,
	sheet_to_row_object_array: sheet_to_row_object_array
};

XLSX.read = read;
XLSX.readFile = readFile;
XLSX.write = write;
XLSX.writeFile = writeFile;
XLSX.version = '0.8.0';
XLSX.SSF = SSF;
if(typeof require !== 'undefined') {
	var fs = require('fs');
	readFile = function(filename, options) { return read(fs.readFileSync(filename), options); };
	writeFile = function(data, filename, options) { return fs.writeFileSync(filename, write(data, options)); };
	var path = require('path');
	var cfbpath = path.resolve(path.dirname(module.filename), 'cfb.js');
	if(fs.existsSync(cfbpath)) XLSX.CFB = require(cfbpath);
}
})(XLSX);
if(typeof module !== 'undefined') module.exports = XLSX;
