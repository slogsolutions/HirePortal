// global theme
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// Global theme (ONE TIME)
export const AppSkeletonProvider = ({ children }) => {
  return (
    <SkeletonTheme
      baseColor="#e2e8f0"
      highlightColor="#f8fafc"
      duration={1.2}
    >
      {children}
    </SkeletonTheme>
  );
};

export default Skeleton;