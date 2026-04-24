// universal loader
import Skeleton from "./SkeletonWrapper";

const PageSkeleton = () => {
  return (
    <div className="p-4 space-y-4">
      {/* Navbar */}
      <Skeleton height={40} />

      {/* Title */}
      <Skeleton height={30} width="30%" />

      {/* Content blocks */}
      <Skeleton height={150} />
      <Skeleton height={150} />
      <Skeleton height={150} />
    </div>
  );
};

export default PageSkeleton;