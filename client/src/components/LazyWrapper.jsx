import React, { Suspense } from "react";
import PageSkeleton from "./ui/PageSkeleton";

const LazyWrapper = ({ children }) => {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  );
};

export default LazyWrapper;