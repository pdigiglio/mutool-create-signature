`create-signature.js` creates digital signatures in `.pdf` documents leveraging
tools from the [MuPdf](https://mupdf.readthedocs.io/en/latest/index.html)
project.


## How to run it.

You have to run `create-signature.js` via
[`mutool run`](https://mupdf.readthedocs.io/en/latest/mutool-run.html), e.g.:

```sh
mutool run create-signature --help
```


### Script settings

The behavior of `create-signature.js` is controlled via a number of settings.
Some of these settings have a default value; you may them in the `defaultArgs`
object in `create-signature.js`. If no command-line option is given, the
default settings will be used.

If you have a set of options you use often, you may store them in a JSON file.
You can then pass its path to `create-signature.js` via the `--config <path>`
command-line option. The settings you define in the JSON file will override the
default one.

Finally, you may override any setting with a command-line argument.
Command-line arguments take precedence over any setting.

As an example, suppose you have the following `cfg.json` file:

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

Will have:

 * `output` be `output_from_cmd_line.pdf` (from the command line, even though
 it's also set in `cfg.json`);

 * `signatureConfig.showLabels` be `true` (from `cfg.json`);

 * Any other setting will have its default value (if any).


### Known limitations

 * The paths in `config.json` must be absolute and no shell expansion will be performed.
