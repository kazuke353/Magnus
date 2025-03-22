import Card from "~/components/Card";
import { ReactNode } from "react";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  iconBgClass: string;
  iconColorClass: string;
  cardBgClass: string;
  valueClass?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  cardBgClass,
  valueClass = "text-gray-900 dark:text-gray-100", // Default value class
}) => {
  return (
    <Card className={`${cardBgClass} shadow-md rounded-xl p-4`}>
      <div className="flex items-center">
        <div className={`p-4 rounded-full ${iconBgClass}`}>
          <Icon className={`h-6 w-6 ${iconColorClass}`} />
        </div>
        <div className="ml-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{title}</h3>
          <p className={`text-xl font-bold ${valueClass} mt-1`}>
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default SummaryCard;
