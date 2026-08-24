import type { FormLevel, Student } from "@/lib/types";

export const CLASS_STREAMS = ["A", "B", "C", "D", "E"] as const;
export const FORMS: FormLevel[] = [1, 2, 3, 4, 5, 6];

export function allClassNames(): string[] {
  return FORMS.flatMap((form) => CLASS_STREAMS.map((stream) => `${form}${stream}`));
}

export const CLASS_TEACHERS: Record<string, string> = {
  "1A": "李志強",
  "1B": "陳惠玲",
  "1C": "張志偉",
  "1D": "吳美琪",
  "1E": "黃家明",
  "2A": "劉雅婷",
  "2B": "鄭偉豪",
  "2C": "何詩韻",
  "2D": "林俊傑",
  "2E": "馬翠珊",
  "3A": "蔡子軒",
  "3B": "周啟明",
  "3C": "葉曉彤",
  "3D": "羅嘉欣",
  "3E": "馮志成",
  "4A": "謝詠儀",
  "4B": "潘浩然",
  "4C": "鄧麗萍",
  "4D": "韓子健",
  "4E": "袁淑芬",
  "5A": "林佩儀",
  "5B": "高俊宇",
  "5C": "鍾雅文",
  "5D": "黎家樂",
  "5E": "溫曉琳",
  "6A": "黃詠詩",
  "6B": "蘇子朗",
  "6C": "莫凱婷",
  "6D": "錢偉文",
  "6E": "方曉晴",
};

const FEATURED_IDS = new Set(["1A", "3B", "5A", "6A"]);

const SURNAMES = ["陳", "林", "黃", "張", "李", "周", "吳", "劉", "鄭", "何", "蔡", "梁", "羅", "馮", "葉"];
const GIVEN = [
  "梓軒",
  "凱晴",
  "子諾",
  "嘉怡",
  "浩然",
  "詠琳",
  "曉彤",
  "俊宇",
  "芷晴",
  "芯怡",
  "銘軒",
  "嘉琪",
  "子謙",
  "樂文",
  "詩涵",
  "浩廷",
  "天恩",
  "依琳",
  "嘉朗",
  "俊傑",
  "雅文",
  "天朗",
  "思穎",
  "樂兒",
  "梓謙",
  "曉琳",
  "家樂",
  "凱婷",
  "偉文",
  "曉晴",
];
const SURNAMES_EN = [
  "Chan",
  "Lam",
  "Wong",
  "Cheung",
  "Lee",
  "Chow",
  "Ng",
  "Lau",
  "Cheng",
  "Ho",
  "Choi",
  "Leung",
  "Lo",
  "Fung",
  "Yip",
];
const GIVEN_EN = [
  "Tsz Hin",
  "Hoi Ching",
  "Tsz Nok",
  "Ka Yi",
  "Ho Yin",
  "Wing Lam",
  "Hiu Tung",
  "Chun Yu",
  "Tsz Ching",
  "Sum Yi",
  "Ming Hin",
  "Ka Ki",
  "Tsz Him",
  "Lok Man",
  "Sze Han",
  "Ho Ting",
  "Tin Yan",
  "Yee Lam",
  "Ka Long",
  "Chun Kit",
  "Nga Man",
  "Tin Long",
  "Sze Wing",
  "Lok Yee",
  "Tsz Him",
  "Hiu Lam",
  "Ka Lok",
  "Hoi Ting",
  "Wai Man",
  "Hiu Ching",
];

export function generatedClassStudents(): Student[] {
  const students: Student[] = [];
  for (const form of FORMS) {
    for (const [streamIndex, stream] of CLASS_STREAMS.entries()) {
      const className = `${form}${stream}`;
      if (FEATURED_IDS.has(className)) continue;
      const teacher = CLASS_TEACHERS[className];
      const teacherId = `u-${form}${stream.toLowerCase()}`;
      const year = 26 - form;
      for (let index = 1; index <= 6; index += 1) {
        const nameIndex = (form * 17 + streamIndex * 7 + index) % SURNAMES.length;
        const givenIndex = (form * 11 + streamIndex * 5 + index * 3) % GIVEN.length;
        const pad = String(index).padStart(2, "0");
        students.push({
          id: `s${form}${stream.toLowerCase()}${pad}`,
          studentNo: `${year}${String(streamIndex + 1).padStart(2, "0")}${String(index).padStart(3, "0")}`,
          name: `${SURNAMES[nameIndex]}${GIVEN[givenIndex]}`,
          nameEn: `${SURNAMES_EN[nameIndex]} ${GIVEN_EN[givenIndex]}`,
          form,
          className,
          homeroomTeacherId: teacherId,
          homeroomTeacherName: teacher,
        });
      }
    }
  }
  return students;
}
