import type { FormLevel, Student } from "@/lib/types";

export const CLASS_STREAMS = ["A", "B", "C", "D", "E"] as const;
export const FORMS: FormLevel[] = [1, 2, 3, 4, 5, 6];

export function allClassNames(): string[] {
  return FORMS.flatMap((form) => CLASS_STREAMS.map((stream) => `${form}${stream}`));
}

export const CLASS_TEACHERS: Record<string, string> = {
  "1A": "黃轉鳳、郭家銘",
  "1B": "何慧欣、范嘉揚",
  "1C": "Ramandeep、丘健",
  "1D": "Dari、鄧鵠耀",
  "1E": "Scott、張思華",
  "2A": "林紀彤",
  "2B": "陳紀筠",
  "2C": "黃詠淇",
  "2D": "Wayne、黃麗娜",
  "2E": "Roisin、陳振華",
  "3A": "陳珮儀",
  "3B": "黃俊偉",
  "3C": "陳梃浠",
  "3D": "徐治文",
  "3E": "Johan、范㬢文",
  "4A": "馮耀强",
  "4B": "周柏言",
  "4C": "林子華",
  "4D": "韓卓穎",
  "4E": "吳諾文、Heumil Wang",
  "5A": "曹思思",
  "5B": "黃子毅",
  "5C": "劉倩慈",
  "5D": "歐陽佩霞",
  "5E": "劉麗芳、黃守宏",
  "6A": "黃天異",
  "6B": "陳秋雲",
  "6C": "廖淑君、羅祉臻",
  "6D": "李日東",
  "6E": "鄭敬宏、Mirza",
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
