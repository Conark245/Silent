with open('server/db.ts', 'r') as f:
    content = f.read()

new_logic = """  addDonationEvent(donation: Donation): DonationEvent {
    const item = donation.donationItemId
      ? this.getDonationItemById(donation.donationItemId)
      : undefined;

    const sticker = item?.stickerId ? this.getMediaAssetById(item.stickerId) : undefined;
    let sound = item?.soundId ? this.getMediaAssetById(item.soundId) : undefined;
    const video = item?.videoId ? this.getMediaAssetById(item.videoId) : undefined;

    // Use default sound if item doesn't have a specific sound
    if (!sound) {
      const sysSettings = this.getSystemSettings();
      if (sysSettings.defaultSoundId) {
        sound = this.getMediaAssetById(sysSettings.defaultSoundId);
      }
    }

    const eventId = `EVT-${donation.publicId}-${Date.now()}`;
    const event: DonationEvent = {"""

old_logic = """  addDonationEvent(donation: Donation): DonationEvent {
    const item = donation.donationItemId
      ? this.getDonationItemById(donation.donationItemId)
      : undefined;

    const sticker = item?.stickerId ? this.getMediaAssetById(item.stickerId) : undefined;
    const sound = item?.soundId ? this.getMediaAssetById(item.soundId) : undefined;
    const video = item?.videoId ? this.getMediaAssetById(item.videoId) : undefined;

    const eventId = `EVT-${donation.publicId}-${Date.now()}`;
    const event: DonationEvent = {"""

content = content.replace(old_logic, new_logic)

with open('server/db.ts', 'w') as f:
    f.write(content)
