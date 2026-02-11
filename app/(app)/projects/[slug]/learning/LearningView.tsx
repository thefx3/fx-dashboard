export default async function LearningView({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}
) {
    const { slug } = await params;
    return (
        <div>
            
            Learning Page for project {slug}
        
        </div>
    )
}