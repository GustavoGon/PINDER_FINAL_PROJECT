const { getRecommendations } = require("../services/recommendation.service");

exports.getRecommendations = async (req, res) => {
  try {
    const { pet_id } = req.params;

    const recommendations = await getRecommendations(pet_id);

    res.status(200).json(recommendations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching recommendations" });
  }
};
