#!/bin/sh
mkdir -p public/models/avatar
curl -L -o public/models/avatar/tescha_avatar_final.glb https://github.com/Orama09/agente-ia-multientorno-uth-tescha/releases/download/assets-v1/tescha_avatar_final.glb
npm run build
npm run start