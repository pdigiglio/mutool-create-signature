/**
 * create-signature.js
 *
 * This file is meant to be run by `mutool` as:
 *
 * mutool run crete-signature.js <args...>
 *
 */

/**
 * Merge data from `source` object into `target`, similar to `Object.assign()`.
 * If properties in `source` are objects, they are merged recursively.
 *
 * @param target - The target object (gets modified).
 * @param source - The souece object (not modified).
 * @returns The target object.
 */
function mergeObjects(target, source) {
    if (target == null)
        return source;

    if (source == null)
        return target;

    var sourceKeys = Object.keys(source);
    for (var i = 0; i < sourceKeys.length; ++i) {
        var key = sourceKeys[i];
        var sourceValue = source[key];

        if (sourceValue instanceof Object) {
            if (!(target[key] instanceof Object)) {
                // Initialize an empty object if needed
                target[key] = {};
            }

            // Recursively merge nested objects
            mergeObjects(target[key], sourceValue);
        } else {
            target[key] = sourceValue;
        }
    }

    return target;
}

/**
 * The default application arguments.
 *
 * If not provided on the cmd-line, the default options will be taken from this
 * object.
 */
var defaultArgs = {
    /**
     * The name of the signature.
     */
    signatureName: "signature",

    /**
     * The position of the signature.
     *
     * This field must have 5 comma-separated numbers:
     *  - The first integer is a 0-based page number.
     *  - The other four float fields are the top left and bottom right points
     *  of the rectangle.
     */
    where: "0,0,0,100,200",

    /**
     * The ouput file.
     */
    output: "output.pdf",

    /**
     * Whether to print the help string.
     */
    help: false,

    /**
     * The signature configuration. See:
     * https://mupdf.readthedocs.io/en/latest/mutool-run-js-api.html#signature-configuration-object
     */
    signatureConfig: {
        /**
         * Whether to include both labels and values or just values on the
         * right hand side.
         */
        showLabels : false,

        /**
         * Whether to include the distinguished name on the right hand side.
         */
        showDN : false,

        /**
         * Whether to include the name of the signatory on the right hand side.
         */
        showTextName : false,

        /**
         * Whether to include the date of signing on the right hand side.
         */
        showDate : false,

        /**
         * Whether to include the signatory name on the left hand side.
         */
        showGraphicName : false,

        /**
         * Whether to include the MuPDF logo in the background.
         */
        showLogo : false,
    },

    /**
     * Stringify the parsed cmd-line args, making sure not to expose the password
     * in plain text.
     *
     * @returns The string representation of the args.
     */
    toString: function() {
        var replacer = function(key, val) {
            return key == "pass" ? "***" : val;
        };

        return JSON.stringify(this, replacer, 2);
    },

    mergeWith: function(other) {
        return mergeObjects(this, other);
    },

    /** 
     * Deep clone this object.
     */
    clone: function() {
        // Copy data.
        var cp = JSON.parse(JSON.stringify(this));

        // Copy member functions.
        cp.toString = this.toString;
        cp.clone = this.clone;
        cp.mergeWith = this.mergeWith;

        return cp;
    },
};

/**
 * The MIME type of a PDF file.
 */
var pdfFiletype = "application/pdf";

/**
 * Return the program usage as a string.
 * @returns The program help.
 */
function getUsage() {
    return ""
        + "USAGE:\n"
        + "  mutool run create-signature.js <options...>\n"
        + "\n"
        + "OPTIONS:\n"
        + "If an option is marked as \"optional\" or has a default value,\n"
        + "it may be omitted.\n"
        + "\n"
        + "  --config <file>  The JSON config file. Further cmd-line args\n"
        + "                   will override settings in this file\n"
        + "  --input <file>   The input file\n"
        + "  --output <file>  The output file\n"
        + "                   (default: '" + defaultArgs.output + "')\n"
        + "  --cert <file>    The signature file\n"
        + "  --pass <pass>    The password to unlock the signature\n"
        + "  --where <pos>    The signature position in the document\n"
        + "                   (default: '" + defaultArgs.where + "')\n"
        + "  --img <file>     The signature image (optional)\n"
        + "  --help           Show this help";
}

/**
 * Check if an index is within the bounds of an array.
 *
 * @param {Array} array - The array to check against.
 * @param {number} array - The index to check.
 *
 * @returns `true`, if the index is within the bounds; `false`, otherwise.
 */
function idxInRange(array, idx) {
    return 0 <= idx && idx < array.length;
}
    
/**
 * Parse a long option (e.g. "--input") from a command line. Long options
 * expect an argument.
 *
 * @param {Array} cmdLineArgs - The tokenized cmd-line arguments.
 * @param {String} longOption - The option name.
 *
 * @returns An object like `{ longOption: val }`, if `val` could be parsed;
 * `null`, otherwise.
 */
function parseCmdLongOption(cmdLineArgs, longOption) {
    var kv = null;

    var i = cmdLineArgs.lastIndexOf("--" + longOption);
    if (idxInRange(cmdLineArgs, i) && idxInRange(cmdLineArgs, i + 1)) {
        kv = {}; // Create object
        kv[longOption] = cmdLineArgs[i + 1];
    }

    return kv;
}

/**
 * Parse a long flag (e.g. "--help") from a command line. Flags expect no
 * argument.
 *
 * @param {Array} cmdLineArgs - The tokenized cmd-line arguments.
 * @param {String} longFlag - The flag name.
 *
 * @returns An object like `{ longFlag: true }`, if the flag is in the command
 * line; `null`, otherwise.
 */
function parseCmdLongFlag(cmdLineArgs, longFlag) {
    var kv = null;

    var i = cmdLineArgs.lastIndexOf("--" + longFlag);
    if (idxInRange(cmdLineArgs, i)) {
        kv = {}; // Create object
        kv[longFlag] = true;
    }

    return kv;
}

/**
 * Read an input file and parse it as JSON.
 *
 * @param {String} filePath - The path to the file to open.
 * @returns An object with a boolean, an error message and the parsed JSON (if any).
 */
function parseJsonFromFile(filePath) {
    var json = { ok: false, errorMsg: "" };

    try {
        var buf = mupdf.readFile(filePath);
        var bufContent = buf.asString();
        json.json = JSON.parse(bufContent);
        json.ok = true;
    }
    catch (e) {
        json.errorMsg = "Could not parse '" + filePath + "' as JSON";
    }

    return json;
}

/**
 * Parse cmd-line args to a JSON object.
 *
 * @param {Array} args - The tokenized command line arguments.
 * @returns A JSON object with the parsed cmd line.
 */
function parseArgs(args) {
    // 1. Start from default args.
    var parsedArgs = defaultArgs.clone();

    // Exception: parse "help" from the cmd line upfront so that I can skip
    // quite some work if an help message is requested.
    parsedArgs.mergeWith(parseCmdLongFlag(args, "help"));
    if (parsedArgs.help != null && parsedArgs.help)
        return parsedArgs; // No need to parse further.

    // 2. Read config file, if any.
    var cfg = parseCmdLongOption(args, "config");
    if (cfg != null) {
        parsedArgs.mergeWith(cfg);

        var parsedJson = parseJsonFromFile(cfg.config);
        if (parsedJson.ok) {
            parsedArgs.mergeWith(parsedJson.json);
        }
        else {
            // Ignore this error and continue.
            console.log(parsedJson.errorMsg);
        }
    }

    // 3. Parse cmd line.
    parsedArgs.mergeWith(parseCmdLongOption(args, "input"));
    parsedArgs.mergeWith(parseCmdLongOption(args, "output"));
    parsedArgs.mergeWith(parseCmdLongOption(args, "cert"));
    parsedArgs.mergeWith(parseCmdLongOption(args, "pass"));
    parsedArgs.mergeWith(parseCmdLongOption(args, "where"));
    parsedArgs.mergeWith(parseCmdLongOption(args, "img"));

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
        var file = args[fileDesc];

        var v = { ok : file != null, errorMsg : "" };
        if (!v.ok) {
            v.errorMsg = fileDesc + ": missing argument";
            return v;
        }

        v.ok = fileExists(file);
        if (!v.ok) 
            v.errorMsg = fileDesc + ": " + file + " : No such file";

        return v;
    };

    // Check input exists and is PDF.
    var validation = validateFileExists(args, "input");
    if (!validation.ok)
        return validation;

    validation.ok = isPdf(args.input);
    if (!validation.ok) {
        validation.errorMsg = "input file is not a PDF file";
        return validation;
    }

    // Check certificate exists.
    validation = validateFileExists(args, "cert");
    if (!validation.ok)
        return validation;

    // If an image is given, check it exists.
    if (args.img != null) {
        validation = validateFileExists(args, "img");
        if (!validation.ok)
            return validation;
    }

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

/**
 * Sign a document page.
 *
 * @param {PDFPage} page - The document page.
 * @param {Object} signatureRect - The rectangle for the signature.
 * @param {Object} args - The cmd-line args.
 */
function parseDocumentPage(page, signatureRect, args) {
    var tl = signatureRect.topLeft;
    var br = signatureRect.bottomRight;
    console.log("Signing in rectangle: " + JSON.stringify(tl) + ", "+ JSON.stringify(br));

    var signature = page.createSignature(args.signatureName);
    signature.setRect([tl.x, tl.y, br.x, br.y]);

    var signer = new PDFPKCS7Signer(args.cert, args.pass);
    var image = null;
    if (args.img) {
        var imageBuf = new mupdf.readFile(args.img);
        image = new mupdf.Image(imageBuf);
    }

    var reason = "";
    var location = "";
    signature.sign(signer, args.signatureConfig, image, reason, location);
    signature.update();
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

    console.log("Signing page " + (pageIdx + 1) + " (index " + pageIdx + ") of " + pageCount);
    var page = doc.loadPage(pageIdx);
    var rect = signaturePos.rect;
    parseDocumentPage(page, signaturePos.rect, args);

    doc.save(args.output, "");
    return { ok : true };
}

function main(programArgs) {
    var args = parseArgs(programArgs);
    if (args.help) {
        var usage = getUsage();
        console.log(usage);
        return 0;
    }

    //console.log("Adding signature");
    console.log("Params: " + args);

    var validation = validateArgs(args);
    if (!validation.ok) {
        console.error(validation.errorMsg);
        return 1;
    }


    var sign = signDocument(args);
    if (!sign.ok) {
        console.error(sign.errorMsg);
        return 1;
    }

    return 0;
}

main(scriptArgs)
