/**
 * articleInfo（条文番号）による並び替えユーティリティ
 */

export interface RiskWithArticleInfo {
    articleInfo?: string | null;
    [key: string]: any;
}

/**
 * articleInfoから条文番号を抽出
 */
export const parseArticleNumber = (articleInfo: string | null | undefined): number => {
    if (!articleInfo) return 999999; // articleInfoがない場合は最後に

    // "第9条"、"第17条第1項第1号" のような形式から数値を抽出
    const match = articleInfo.match(/第(\d+)条/);
    return match ? parseInt(match[1]) : 999999;
};

/**
 * articleInfoから項・号を抽出
 */
export const parseSubSection = (articleInfo: string | null | undefined): [number, number] => {
    if (!articleInfo) return [999, 999];

    const itemMatch = articleInfo.match(/第(\d+)項/);
    const subMatch = articleInfo.match(/第(\d+)号/);

    return [
        itemMatch ? parseInt(itemMatch[1]) : 0,
        subMatch ? parseInt(subMatch[1]) : 0
    ];
};

/**
 * リスクを条文番号順にソート
 */
export const sortRisksByArticleInfo = <T extends RiskWithArticleInfo>(risks: T[]): T[] => {
    return [...risks].sort((a, b) => {
        const aNum = parseArticleNumber(a.articleInfo);
        const bNum = parseArticleNumber(b.articleInfo);

        if (aNum !== bNum) {
            return aNum - bNum; // 条文番号の昇順
        }

        // 同じ条文の場合は項・号でソート
        const [aItem, aSubItem] = parseSubSection(a.articleInfo);
        const [bItem, bSubItem] = parseSubSection(b.articleInfo);

        if (aItem !== bItem) return aItem - bItem;
        return aSubItem - bSubItem;
    });
};
