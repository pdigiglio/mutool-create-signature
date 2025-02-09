`create-signature.js` creates digital signatures in `.pdf` documents leveraging
tools from the [MuPdf](https://mupdf.readthedocs.io/en/latest/index.html)
project.


## How to run it.

You have to run `create-signature.js` via
[`mutool run`](https://mupdf.readthedocs.io/en/latest/mutool-run.html), e.g.:

```sh
mutool run create-signature.js --help
```


### Script settings

The behavior of `create-signature.js` is controlled via a number of settings.
Some of these settings have a default value; you may them in the `defaultArgs`
object in `create-signature.js`. If no command-line option is given, the
default settings will be used.

If you have a set of options you use often, you may store them in a JSON file.
You can then pass its path to `create-signature.js` via the `--config <path>`
command-line option. The settings you define in the JSON file will override the
default ones.

Finally, you may override any setting with a command-line argument. Cmd-line
arguments take precedence over any setting. To see a list of options, use
`--help`.

#### Example

Suppose you have the following `cfg.json` file:

```json
{
    "output" : "output_from_json.pdf",
    "signatureConfig" : {
        "showLabels" : true,
    }
}
```

Then:

```sh
mutool run create-signature --config cfg.json --output output_from_cmd_line.pdf
```

Will use the following settings:

 * `output: output_from_cmd_line.pdf` (from the command line, even though it's
 also set in `cfg.json`);

 * `signatureConfig.showLabels: true` (from `cfg.json`);

 * Any other setting will have its default value (if any).


### Known limitations

 * The paths in the JSON configuration  must be absolute and no shell expansion
 will be performed.
