# Homebrew cask draft (not submitted). Replace version/sha256 from a real release.
# homebrew/cask requires the app to be notable; until then, publish in a personal tap
# (github.com/BowieMoonenTTV/homebrew-tap) instead of opening a PR to homebrew/cask.
cask "miku-home" do
  version "0.1.0"
  sha256 "REPLACE_WITH_SHA256_OF_RELEASE_DMG"

  url "https://github.com/BowieMoonenTTV/miku-home/releases/download/v#{version}/Miku.Home_#{version}_universal.dmg"
  name "Miku Home"
  desc "Accessible, local-first voice assistant"
  homepage "https://github.com/BowieMoonenTTV/miku-home"

  app "Miku Home.app"

  zap trash: [
    "~/Library/Application Support/io.github.BowieMoonenTTV.MikuHome",
    "~/Library/WebKit/io.github.BowieMoonenTTV.MikuHome",
  ]
end
