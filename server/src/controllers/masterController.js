const masterService = require("../services/masterService");
const { isPlatformAdmin } = require("../middlewares/platformAdmin");

/**
 * The platform masters, read.
 *
 * Writing them is the admin console's job and is not built yet; this is the
 * read side, which every screen with a unit or a tax rate dropdown needs.
 *
 * Readable by any signed in user, deliberately. These are the state list, the
 * units, the GST slabs and a short list of HSN codes: public facts, printed on
 * documents that go to customers. Gating them would only mean a buyer's
 * checkout could not name the state he lives in.
 */
exports.getMasters = async (req, res) => {
  try {
    const [states, units, taxRates, hsn] = await Promise.all([
      masterService.states(),
      masterService.units(),
      masterService.taxRates(),
      masterService.hsn(),
    ]);
    res.status(200).json({
      states,
      units,
      taxRates,
      hsn,
      // So a screen can tell "the platform has no units" from "this database
      // has not had the migration run and you are seeing the built in list".
      fromMasters: await masterService.mastersExist(),
      isPlatformAdmin: await isPlatformAdmin(req.user?.id),
    });
  } catch (err) {
    console.error("Error reading the masters:", err);
    res.status(500).json({ message: "Server error" });
  }
};
