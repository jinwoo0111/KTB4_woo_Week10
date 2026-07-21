import "./route-placeholder.css";

function RoutePlaceholder({ eyebrow, title, description }) {
  return (
    <section className="route-placeholder">
      <p className="route-placeholder__eyebrow">{eyebrow}</p>
      <h1 className="route-placeholder__title">{title}</h1>
      <p className="route-placeholder__description">{description}</p>
    </section>
  );
}

export default RoutePlaceholder;
