import type { MyReviews, TeamReviewCounts } from "../../domain";
import { MyReviewsSection } from "./MyReviewsSection";
import { Section } from "./Section";

interface ReviewSectionsProps {
  readonly data: TeamReviewCounts;
  readonly myReviews: MyReviews;
  readonly threshold: number;
}

export function ReviewSections({ data, myReviews, threshold }: ReviewSectionsProps) {
  return (
    <>
      <MyReviewsSection myReviews={myReviews} />
      <Section label="FRONTEND" members={data.frontend} threshold={threshold} tone="frontend" />
      <Section label="BACKEND" members={data.backend} threshold={threshold} tone="backend" />
      <Section label="AUTRES" members={data.others} threshold={threshold} tone="muted" />
      <div className="h-1.5" />
    </>
  );
}
