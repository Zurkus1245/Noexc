#!/bin/sh
# usage: sh src/build.sh trainer|client [title]  -> gymbro-<role>.html
# Base styles, glass layer and icons live in src/base-*; role logic in src/<role>.js.
cd "$(dirname "$0")/.."; R=$1; T="GymBro · ${2:-$R}"
{ sed "s#<title>[^<]*</title>#<title>$T</title>#" src/base-head.html
  echo '<script>'; cat src/base-icons.js src/$R.js; [ "$R" = client ] && cat src/builder.js src/progress.js; cat src/common.js; echo 'boot();'; echo '</script>'
  cat src/common.css src/base-tail.html; } > gymbro-$R.html
echo "built gymbro-$R.html ($(wc -l < gymbro-$R.html) lines)"
