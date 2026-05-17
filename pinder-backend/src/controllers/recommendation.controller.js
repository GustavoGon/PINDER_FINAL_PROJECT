const { getRecommendations } = require("../services/recommendation.service");

exports.getRecommendations = async (req, res) => {
  try {
    const { pet_id, user_id, mode } = req.query;

    console.info('[Recommendations] Request recebida', {
      mode: mode || 'normal',
      hasPetId: Boolean(pet_id),
      hasUserId: Boolean(user_id),
    });

    const data = await getRecommendations({
      pet_id,
      user_id,
      mode: mode || "normal",
    });

    console.info('[Recommendations] Resultado gerado', {
      mode: mode || 'normal',
      count: data.length,
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
