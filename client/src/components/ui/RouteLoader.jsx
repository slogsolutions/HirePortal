import PageSkeleton from "./PageSkeleton";

const RouteLoader = ({ loading, children }) => {
  if (loading) return <PageSkeleton />;
  return children;
};

export default RouteLoader;