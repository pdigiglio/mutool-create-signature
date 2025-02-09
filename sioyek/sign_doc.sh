#!/usr/bin/bash

# To integrate with sioyek, add the following line to prefs_user.confg:
#
# new_command _sign sh <abs_path>/sign_doc.sh %{file_path} %{selected_rect}
#
# See:
# https://sioyek-documentation.readthedocs.io/en/latest/scripting.html


function get_pass() {
    # Eval password here.
    echo "password"
}

function get_output() {
    typeset -r input="$1"
    typeset -r dirname="$(dirname "$input")"
    typeset -r in_filename="$(basename "$input")"
    typeset -r in_basename="${in_filename%.*}"
    typeset -r out_filename="${in_basename}_signed.pdf"
    echo "$dirname/$out_filename"
}

# By default, top left of first page.
typeset -r input_pdf="$1"
typeset -r signature_pos="$2"

typeset -r output_pdf="$(get_output "$input_pdf")"

typeset -r signature_cert="abs_path.pfx"
typeset -r signature_img="abs_path.jpeg"

mutool run ~/Projects/mutool-create-signature/create-signature.js \
    --input "$input_pdf" \
    --output "$output_pdf" \
    --cert "$signature_cert" \
    --pass "$(get_pass)" \
    --img "$signature_img" \
    --where "$signature_pos"
