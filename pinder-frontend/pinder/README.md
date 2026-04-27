# Pinder Frontend

Guia rápido para gerar APK Release no Windows.

## Pré-requisitos (uma vez)

1. Android SDK instalado (Android Studio).
2. Java 17 instalado.
3. Long Paths do Windows ativado.
4. Keystore de release criado em android/app/release.keystore.
5. Arquivo android/key.properties preenchido com as credenciais da keystore.

Exemplo de android/key.properties:

```properties
storeFile=release.keystore
storePassword=SUA_PASSWORD
keyAlias=release_alias
keyPassword=SUA_PASSWORD_DA_KEY
```

## Passo a passo para gerar APK Release (sempre que precisar)

Executar no PowerShell:

```powershell
cd C:\Users\admin\Desktop\PINDER\pinder-frontend\pinder

# Caminho curto para evitar erro de filename > 260
if (Test-Path C:\pinder_short) { Remove-Item -Recurse -Force C:\pinder_short }
robocopy "C:\Users\admin\Desktop\PINDER\pinder-frontend\pinder" "C:\pinder_short" /MIR /XD node_modules .expo android\app\build android\.gradle .gradle

cd C:\pinder_short
npm install

# Garantir Android SDK no clone curto
if (!(Test-Path C:\pinder_short\android\local.properties)) {
  "sdk.dir=C\\:\\Users\\admin\\AppData\\Local\\Android\\Sdk" | Out-File -Encoding ASCII C:\pinder_short\android\local.properties
}

cd C:\pinder_short\android
./gradlew --stop
./gradlew clean
./gradlew assembleRelease --no-daemon
```

## Onde buscar o APK gerado

Após build com sucesso, o arquivo fica em:

- C:\pinder_short\android\app\build\outputs\apk\release\app-release.apk

Para listar no terminal:

```powershell
Get-ChildItem C:\pinder_short\android\app\build\outputs\apk\release
```

## Observações

1. Se rodar o build no caminho original longo, pode voltar o erro de filename maior que 260.
2. O fluxo em C:\pinder_short evita esse problema no Windows.
3. Se trocar versão de dependências nativas, rode novamente gradlew clean antes do assembleRelease.
