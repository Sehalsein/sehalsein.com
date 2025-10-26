export type BaseTab = {
    id: string;
    page: WebPage;

};

export type TabActions = {
    goBack?: () => void;
    goForward?: () => void;
    refresh: () => void;
    home: () => void;
    push: (url: string, options?: { newTab?: boolean }) => void;
    setLoading: (loading: boolean) => void;
};

export type Tab = BaseTab & {
    isLoading?: boolean;
    history?: WebPage[];
}

type WebPage = {
    id: string;
    url: string;
    title: string;
};