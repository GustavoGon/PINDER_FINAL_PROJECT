function getEventStatus(event) {
  const now = new Date();

  if (event.cancelled) {
    return "CANCELLED";
  }

  if (now < event.starts_at) {
    return "UPCOMING";
  }

  if (now >= event.starts_at && (!event.ends_at || now <= event.ends_at)) {
    return "ONGOING";
  }

  return "FINISHED";
}

module.exports = {
  getEventStatus,
};
