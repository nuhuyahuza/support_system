import type { Announcement } from '@/types/chat';

export default function PinnedAnnouncement({ announcement }: { announcement: Announcement }) {
    if (!announcement) {
        return null;
    }

    return (
        <div className="mx-auto my-3 max-w-xl rounded-lg border border-[#ffeeb8] bg-[#fff5c4] px-4 py-3 text-center text-[13px] leading-5 text-[#1d1d1d] shadow-sm dark:border-[#5c5330] dark:bg-[#2a2618] dark:text-[#f5f0d8]">
            <div className="mb-1 font-semibold text-[#54656f] dark:text-[#aebac1]">{announcement.title}</div>
            <div className="whitespace-pre-wrap">{announcement.body}</div>
        </div>
    );
}
