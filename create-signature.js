/**
 * create-signature.js
 *
 * This file is meant to be run by `mutool` as:
 *
 * mutool run crete-signature.js <args...>
 *
 */

var signatureConfig = {
    // Whether to include both labels and values or just values on the right
    // hand side.
    showLabels : false,

    // Whether to include the distinguished name on the right hand side.
    showDN : false,
    
    // Whether to include the name of the signatory on the right hand side.
    showTextName : false,
    
    // Whether to include the date of signing on the right hand side.
    showDate : false,
    
    // Whether to include the signatory name on the left hand side.
    showGraphicName : false,
    
    // Whether to include the MuPDF logo in the background.
    showLogo : false,
};

/**
 * The MIME type of a PDF file.
 */
var pdfFiletype = "application/pdf";


/**
 * Return the program usage as a string.
 * @returns The program help.
 */
function usage() {
    return "Usage:\n"
        + "  --input <file>   The input file\n"
        + "  --output <file>  The output file (default: <>)\n"
        + "  --cert <file>    The signature file\n"
        + "  --pass <pass>    The signature password\n"
        + "  --where <pos>    The signature position in the document\n"
        + "  --img <file>     The signature image (optional)\n"
        + "  --help           Show this help";
}

/**
 * Stringify the parsed cmd-line args, making sure not to expose the password
 * in plain text.
 *
 * @param args - The parsed cmd-line args.
 * @returns The string representation of the args.
 */
function argsToString(args) {
    var replacer = function(key, val) {
        return key == "pass" ? "***" : val;
    };

    return JSON.stringify(args, replacer, 2);
}

/**
 * Parse cmd-line args to a JSON object.
 *
 * @param args - The command line arguments.
 * @returns A JSON object with the parsed cmd line.
 */
function parseArgs(args) {
    var parsedArgs = {
        signatureName: "signature",
        where: "0,0,0,100,200",
        output: "output.pdf",
        help: false,
        toString:  function() { return argsToString(this); }
    };

    var inArgsBound = function(idx) { return 0 <= idx && idx < args.length; };
    var parseArg = function(args, field) {
        var i = args.lastIndexOf("--" + field);
        if (inArgsBound(i) && inArgsBound(i + 1)) {
            parsedArgs[field] = args[i + 1];
        }
    }

    var parseFlag = function(args, field) {
        var i = args.lastIndexOf("--" + field);
        if (inArgsBound(i)) {
            parsedArgs[field] = true;
        }
    }

    parseFlag(args, "help");
    parseArg(args, "input");
    parseArg(args, "output");
    parseArg(args, "cert");
    parseArg(args, "pass");
    parseArg(args, "where");
    parseArg(args, "img");

    return parsedArgs;
}

// Check if a file exists.
function fileExists(filePath) {
    try {
        // Try and open
        mupdf.readFile(filePath);
    } catch (e) {
        return false;
    }

    return true;
}

// Check if a file is a PDF.
function isPdf(filePath) {
    var isPdf = false;
    try {
        var doc = new mupdf.Document.openDocument(filePath, pdfFiletype);
        isPdf = doc.isPDF();
    } catch (e) {
        // no-op
    }

    return isPdf;
}

/**
 * Validate cmd-line arguments.
 *
 * @params args - The parsed command line args.
 * @returns An object containing the validation status and the error message
 * (if any).
 */
function validateArgs(args) {
    var validation = { ok : true, errorMsg : "" };

    var validateFileExists = function(args, fileDesc) {
        var v = { ok : true, errorMsg : "" };

        var file = args[fileDesc];
        v.ok = file != null;
        if (!v.ok) {
            v.errorMsg = fileDesc + ": missing argument";
            return v;
        }

        v.ok = fileExists(file);
        if (!v.ok) {
            v.errorMsg = fileDesc + ": " + file + " : No such file";
            return v;
        }

        return v;
    };

    var validation = validateFileExists(args, "input");
    if (!validation.ok)
        return validation;

    validation.ok = isPdf(args.input);
    if (!validation.ok) {
        validation.errorMsg = "input file is not a PDF file";
        return validation;
    }

    var validation = validateFileExists(args, "cert");
    if (!validation.ok)
        return validation;

    return validation;
}

function parseSignaturePos(args) {
    var res = {
        status: { ok: false, errorMsg: "" },
    };

    var where = args.where;
    var tokens = where.split(',');
    if (tokens.length != 5) {
        res.status = {
            errorMsg: "where: '" + args.where + "': wrong number of fields (5 expected)"
        };
        return res;
    }

    try {
        res.page = parseInt(tokens[0]);
        res.rect = {
            topLeft: {
                x: parseFloat(tokens[1]),
                y: parseFloat(tokens[2])
            },
            bottomRight: {
                x: parseFloat(tokens[3]),
                y: parseFloat(tokens[4])
            }
        };

        res.status.ok = true;
    }
    catch(e) {
        res.status.errorMsg = "could not parse signature position";
    }

    return res;
}

function signDocument(args) {
    // Parse the position where to place the signature.
    var signaturePos = parseSignaturePos(args);
    if (!signaturePos.status.ok)
        return signaturePos.status;

    // Check the page is valid.
    var doc = new mupdf.Document.openDocument(args.input, pdfFiletype);
    var pageCount = doc.countPages();
    var pageIdx = signaturePos.page;
    if (pageIdx < 0 || pageIdx >= pageCount) {
        var errorMsg_ = "page " + pageIdx + " is out of range [0-" + pageCount + ")";
        return { ok: false, errorMsg: errorMsg_ };
    }

    var page = doc.loadPage(pageIdx);
    var rect = signaturePos.rect;
    var signature = page.createSignature(args.signatureName);

    var tl = rect.topLeft;
    var br = rect.bottomRight;
    signature.setRect([tl.x, tl.y, br.x, br.y]);

    console.log("Signing page " + pageIdx + " from " + JSON.stringify(tl) + " to "+ JSON.stringify(br));

    var signer = new PDFPKCS7Signer(args.cert, args.pass);
    var imageBuf = new mupdf.readFile(args.img);
    var image = new mupdf.Image(imageBuf);
    var reason = "";
    var location = "";
    signature.sign(signer, signatureConfig, image, reason, location);
    signature.update();

    doc.save(args.output, "");
    return { ok : true };
}

function main(programArgs) {
    var args = parseArgs(programArgs);

    //console.log("Adding signature");
    console.log("Params: " + args);

    var validation = validateArgs(args);
    if (!validation.ok) {
        console.error(validation.errorMsg);
        return 1;
    }

    if (args.help) {
        var usage_ = usage();
        console.log(usage_);
        return 0;
    }

    var sign = signDocument(args);
    if (!sign.ok) {
        console.error(sign.errorMsg);
        return 1;
    }

    return 0;
}

main(scriptArgs)
