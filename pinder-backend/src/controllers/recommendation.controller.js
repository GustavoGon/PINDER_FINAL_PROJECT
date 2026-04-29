const { getRecommendations } = require("../services/recommendation.service");

exports.getRecommendations = async (req, res) => {
  try {
    const { pet_id, user_id, mode } = req.query;

    const data = await getRecommendations({
      pet_id,
      user_id,
      mode: mode || "normal",
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
