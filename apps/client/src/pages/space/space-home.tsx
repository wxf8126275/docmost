import {Container} from "@mantine/core";
import SpaceHomeTabs from "@/features/space/components/space-home-tabs.tsx";
import SpacePublicNotice from "@/features/public-space/components/space-public-notice.tsx";
import DrivePage from "@/features/drive/drive-page";
import {useParams} from "react-router-dom";
import {useGetSpaceBySlugQuery} from "@/features/space/queries/space-query.ts";
import { DocumentTitle } from "@/components/ui/document-title.tsx";

export default function SpaceHome() {
    const {spaceSlug} = useParams();
    const {data: space} = useGetSpaceBySlugQuery(spaceSlug);

    // Drive spaces render the cloud drive UI as their space content; page
    // spaces keep the classic overview + page tree.
    if (space?.type === "drive") {
        return <DrivePage />;
    }

    return (
        <>
            <DocumentTitle title={space?.name || 'Overview'} />
            <Container size={"900"} pt="xl">
                {space && <SpacePublicNotice space={space} />}
                {space && <SpaceHomeTabs/>}
            </Container>
        </>
    );
}
