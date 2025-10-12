# Инструкция по сборке Release APK

## Предварительные требования

1. **JDK 17** - установлен в `.jdk/temurin17/`
2. **Android SDK** - путь в `android/local.properties`
3. **Keystore** - `android/keystore.jks` (НЕ коммитить в git!)
4. **Gradle** - используется wrapper `android/gradlew.bat`

## Данные keystore (КОНФИДЕНЦИАЛЬНО!)

```
Файл: android/keystore.jks
Alias: craftcalc
Store Password: CraftCalcStore2025!
Key Password: CraftCalcStore2025!
```

⚠️ **ВАЖНО**: Эти данные уже прописаны в `android/gradle.properties` (файл игнорируется git).

## Быстрая сборка

```powershell
cd android
$env:JAVA_HOME="$PWD/../.jdk/temurin17/jdk-17.0.13+11"
.\gradlew.bat clean assembleRelease
```

APK будет создан в `android/app/build/outputs/apk/release/app-release.apk`

## Автоматическая сборка и копирование

```powershell
# Из корня проекта
cd android
$env:JAVA_HOME="$PWD/../.jdk/temurin17/jdk-17.0.13+11"
.\gradlew.bat clean assembleRelease

# Копируем в удобное место
New-Item -ItemType Directory -Force -Path ../build-output
Copy-Item app/build/outputs/apk/release/app-release.apk ../build-output/CraftCalculator-release-signed.apk
```

## Установка на устройство

```powershell
# Первая установка или обновление
adb install -r build-output/CraftCalculator-release-signed.apk

# Если нужно переустановить с нуля
adb uninstall com.example.craftcalculator
adb install build-output/CraftCalculator-release-signed.apk
```

## Важные моменты

1. **Всегда используйте один и тот же keystore** (`android/keystore.jks`) для всех release-сборок
2. Без этого пользователи не смогут обновить приложение - только удалить и установить заново
3. Keystore действителен 3650 дней (до октября 2035)
4. Backup keystore храните в безопасном месте (облако, password manager, и т.д.)
5. При публикации в Google Play используйте тот же keystore

## Проверка подписи APK

```powershell
# Просмотр информации о подписи
keytool -printcert -jarfile build-output/CraftCalculator-release-signed.apk
```

## Обновление иконок

Если нужно изменить иконки:

1. Отредактируйте `android/app/src/main/res/mipmap-*/ic_launcher_*.png`
2. Foreground должен быть 384×384 с отступом 24px
3. Запустите `npx cap copy android` чтобы синхронизировать ресурсы

## Автоматизация через CI/CD

Для GitHub Actions или других CI систем:

1. Сохраните keystore в секретах репозитория (base64)
2. Добавьте секреты `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
3. В CI декодируйте keystore и передайте параметры в gradle
