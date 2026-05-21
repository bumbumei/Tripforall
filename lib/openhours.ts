// TourAPI detailIntro2의 restdate / usetime 자유 텍스트를 파싱해 (날짜, 시각)에서
// 스팟이 열려 있는지 판정. 완벽 파싱 불가능한 영역이라 휴리스틱 + 보수적 판정.

const WEEKDAY_KW = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

export type ClosureReason =
  | { type: "weekly_holiday"; weekday: string; raw: string }
  | { type: "before_open"; openAt: string; raw: string }
  | { type: "after_close"; closeAt: string; raw: string };

export interface OpenStatus {
  open: boolean;
  reason?: ClosureReason;
  suggestion?: string; // "다른 요일로 바꾸면 열려 있어요" 같은 안내
}

// 휴무일 텍스트에서 요일을 추출 (e.g., "매주 화요일", "월요일 정기휴무").
function extractWeeklyHoliday(restdate: string): number | null {
  const norm = restdate.replace(/\s/g, "");
  if (norm.includes("연중무휴") || norm.includes("없음")) return null;
  for (let i = 0; i < WEEKDAY_KW.length; i++) {
    if (norm.includes(WEEKDAY_KW[i])) return i; // 0=일, 1=월, ...
  }
  return null;
}

// "09:00~18:00" 또는 "09:00-17:00" 같은 첫 번째 시간 범위만 추출.
function extractFirstTimeRange(usetime: string): { open: string; close: string } | null {
  const m = usetime.match(/(\d{1,2}):(\d{2})\s*[~\-–]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return {
    open: `${m[1].padStart(2, "0")}:${m[2]}`,
    close: `${m[3].padStart(2, "0")}:${m[4]}`
  };
}

function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// 메인 판정: (restdate, usetime, 출발 날짜, 출발 시각)으로 open 여부.
// 날짜·시각 미지정 시 항상 열림 (사용자가 시간을 안 정함 → 가정하지 않음).
export function checkOpen(
  restdate: string | undefined,
  usetime: string | undefined,
  date: string | undefined,
  startTime: string | undefined
): OpenStatus {
  if (!date) return { open: true };

  // 1) 휴무일 체크
  if (restdate) {
    const closedDow = extractWeeklyHoliday(restdate);
    if (closedDow !== null) {
      const d = new Date(`${date}T00:00:00`);
      if (d.getDay() === closedDow) {
        const altDate = nextOpenDate(date, closedDow);
        return {
          open: false,
          reason: {
            type: "weekly_holiday",
            weekday: WEEKDAY_KW[closedDow],
            raw: restdate.replace(/<[^>]+>/g, " ").trim().slice(0, 60)
          },
          suggestion: altDate
            ? `${WEEKDAY_KW[closedDow]}은 정기 휴무입니다. ${altDate}로 변경하면 방문 가능합니다.`
            : `${WEEKDAY_KW[closedDow]}은 정기 휴무입니다. 다른 요일로 변경해 보세요.`
        };
      }
    }
  }

  // 2) 운영시간 체크 (시간 미지정이면 통과)
  if (usetime && startTime) {
    const range = extractFirstTimeRange(usetime);
    if (range) {
      const startMin = hhmmToMinutes(startTime);
      const openMin = hhmmToMinutes(range.open);
      const closeMin = hhmmToMinutes(range.close);
      if (startMin < openMin) {
        return {
          open: false,
          reason: { type: "before_open", openAt: range.open, raw: usetime.replace(/<[^>]+>/g, " ").trim().slice(0, 80) },
          suggestion: `이 장소는 ${range.open}에 문을 엽니다. 출발 시간을 ${range.open} 이후로 조정해 보세요.`
        };
      }
      if (startMin >= closeMin) {
        return {
          open: false,
          reason: { type: "after_close", closeAt: range.close, raw: usetime.replace(/<[^>]+>/g, " ").trim().slice(0, 80) },
          suggestion: `이 장소는 ${range.close}에 문을 닫습니다. 더 이른 출발 시간을 선택해 보세요.`
        };
      }
    }
  }

  return { open: true };
}

// 주간 휴무일이 closedDow일 때 그 다음 영업일을 ISO 날짜로.
function nextOpenDate(currentDate: string, closedDow: number): string | null {
  try {
    const d = new Date(`${currentDate}T00:00:00`);
    for (let i = 1; i <= 7; i++) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== closedDow) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} (${WEEKDAY_SHORT[d.getDay()]})`;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}
