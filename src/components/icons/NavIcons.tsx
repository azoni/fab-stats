import {
  LayoutDashboard,
  Swords,
  Plus,
  Users,
  Activity,
  Download,
  CheckCircle,
  FileText,
  X,
  CircleHelp,
  Lock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Rss,
  Trophy,
  Map,
  BookOpen,
  MessageSquare,
  Inbox,
  Sparkles,
} from "lucide-react";
import type { ComponentProps } from "react";

type IconProps = { className?: string };
type LucideIcon = React.FC<ComponentProps<"svg">>;
const d = "w-5 h-5";

function wrap(Icon: LucideIcon) {
  const Wrapped = ({ className = d }: IconProps) => <Icon className={className} />;
  Wrapped.displayName = Icon.displayName || "WrappedIcon";
  return Wrapped;
}

export const DashboardIcon = wrap(LayoutDashboard);
export const SwordsIcon = wrap(Swords);
export const PlusIcon = wrap(Plus);
export const OpponentsIcon = wrap(Users);
export const TrendsIcon = wrap(Activity);
export const ImportIcon = wrap(Download);
export const CheckCircleIcon = wrap(CheckCircle);
export const FileIcon = wrap(FileText);
export const CloseIcon = wrap(X);
export const QuestionCircleIcon = wrap(CircleHelp);
export const LockIcon = wrap(Lock);
export const CalendarIcon = wrap(Calendar);
export const ChevronDownIcon = wrap(ChevronDown);
export const ChevronUpIcon = wrap(ChevronUp);
export const FeedIcon = wrap(Rss);
export const TrophyIcon = wrap(Trophy);
export const MapIcon = wrap(Map);
export const BookIcon = wrap(BookOpen);
export const ChatIcon = wrap(MessageSquare);
export const InboxIcon = wrap(Inbox);
export const SparklesIcon = wrap(Sparkles);

// ShieldIcon is a custom data-visualization illustration, not a standard icon
export function ShieldIcon({ className = d }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="#D9A05B" strokeWidth="2" />
      <rect x="7.5" y="13" width="2" height="3" fill="#E53935" />
      <rect x="11" y="10" width="2" height="6" fill="#FBC02D" />
      <rect x="14.5" y="6" width="2" height="10" fill="#1E88E5" />
    </svg>
  );
}
