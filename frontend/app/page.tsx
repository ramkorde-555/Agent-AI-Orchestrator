import WorkflowCanvas from '@/components/WorkflowCanvas';

export default function Dashboard() {
  return (
    // The parent container must strictly define height/width, 
    // otherwise the React Flow canvas will collapse to 0px.
    <main className="w-full h-screen overflow-hidden bg-white">
      <WorkflowCanvas />
    </main>
  );
}