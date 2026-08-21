#!/bin/sh
# Generates release keystore. Prompts for password (not echoed, not logged).
KT="/c/Program Files/Microsoft/jdk-21.0.10.7-hotspot/bin/keytool"
OUT="C:/UA/organizer/android/organizer-release.jks"
[ -f "$OUT" ] && { echo "REFUSING: $OUT already exists."; exit 1; }
printf 'Keystore password: '
stty -echo; read PW; stty echo; echo
[ -z "$PW" ] && { echo "Empty password. Aborted."; exit 1; }
"$KT" -genkeypair -v -keystore "$OUT" -alias organizer \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$PW" -keypass "$PW" \
  -dname "CN=Fernando Santos, OU=Organizer, O=Organizer, L=Aveiro, ST=Aveiro, C=PT"
