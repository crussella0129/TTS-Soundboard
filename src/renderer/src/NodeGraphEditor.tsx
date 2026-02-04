import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
  ReactFlowProvider,
  useReactFlow,
  ReactFlowInstance
} from 'reactflow'
import 'reactflow/dist/style.css'
import { VoiceGraph } from './types'

interface Props {
  graph: VoiceGraph
  onChange: (graph: VoiceGraph) => void
  dspRegistry: Record<string, DSPNodeDef>
}

/** Convert our VoiceGraph to React Flow format */
function toFlowNodes(graph: VoiceGraph, registry: Record<string, DSPNodeDef>): Node[] {
  const flowNodes: Node[] = [
    {
      id: 'input',
      type: 'ioNode',
      position: graph.nodes.find((n) => n.id === 'input')?.position ?? { x: 50, y: 200 },
      data: { label: 'TTS Input', isInput: true },
      deletable: false
    },
    {
      id: 'output',
      type: 'ioNode',
      position: graph.nodes.find((n) => n.id === 'output')?.position ?? { x: 700, y: 200 },
      data: { label: 'Audio Output', isInput: false },
      deletable: false
    }
  ]

  for (const node of graph.nodes) {
    if (node.id === 'input' || node.id === 'output') continue
    const def = registry[node.type]
    if (!def) continue
    flowNodes.push({
      id: node.id,
      type: 'dspNode',
      position: node.position,
      data: { nodeType: node.type, label: def.label, params: node.params, paramDefs: def.params }
    })
  }

  return flowNodes
}

function toFlowEdges(graph: VoiceGraph): Edge[] {
  return graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: 'var(--accent)', strokeWidth: 2 }
  }))
}

function fromFlow(nodes: Node[], edges: Edge[]): VoiceGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type === 'dspNode' ? n.data.nodeType : n.id,
      position: n.position,
      params: n.data.params ?? {}
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target
    }))
  }
}

/** Custom node for TTS Input / Audio Output */
function IONode({ data }: NodeProps): JSX.Element {
  return (
    <div className="flow-node flow-io-node">
      <div className="flow-node-header io-header">{data.label}</div>
      {data.isInput ? (
        <Handle type="source" position={Position.Right} />
      ) : (
        <Handle type="target" position={Position.Left} />
      )}
    </div>
  )
}

/** Custom node for DSP effect */
function DSPNode({ id, data }: NodeProps): JSX.Element {
  const params = data.params as Record<string, number | string>
  const paramDefs = data.paramDefs as Record<string, DSPParamDef>
  const onParamChange = data.onParamChange as (
    nodeId: string,
    key: string,
    val: number | string
  ) => void

  return (
    <div className="flow-node flow-dsp-node">
      <Handle type="target" position={Position.Left} />
      <div className="flow-node-header">{data.label}</div>
      <div className="flow-node-params">
        {Object.entries(paramDefs).map(([key, def]) => (
          <label key={key} className="flow-param">
            <span className="flow-param-label">
              {def.label}
              <span className="flow-param-value">
                {def.type === 'select' ? String(params[key] ?? def.default) : Number(params[key] ?? def.default).toFixed(def.type === 'int' ? 0 : 1)}
              </span>
            </span>
            {def.type === 'select' ? (
              <select
                value={String(params[key] ?? def.default)}
                onChange={(e) => onParamChange(id, key, e.target.value)}
                className="flow-param-select"
              >
                {def.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="range"
                min={def.min}
                max={def.max}
                step={def.type === 'int' ? 1 : (((def.max ?? 1) - (def.min ?? 0)) / 100)}
                value={Number(params[key] ?? def.default)}
                onChange={(e) => onParamChange(id, key, Number(e.target.value))}
                className="flow-param-slider"
              />
            )}
          </label>
        ))}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { ioNode: IONode, dspNode: DSPNode }

/** Inner editor that has access to useReactFlow */
function GraphEditorInner({ graph, onChange, dspRegistry }: Props): JSX.Element {
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(graph, dspRegistry))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(graph))
  const [addMenuPos, setAddMenuPos] = useState<{ screenX: number; screenY: number } | null>(null)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  // Param change callback injected into DSP nodes
  const onParamChange = useCallback(
    (nodeId: string, key: string, val: number | string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n
          return {
            ...n,
            data: { ...n.data, params: { ...n.data.params, [key]: val } }
          }
        })
      )
    },
    [setNodes]
  )

  // Inject onParamChange into all DSP nodes
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) =>
        n.type === 'dspNode' ? { ...n, data: { ...n.data, onParamChange } } : n
      ),
    [nodes, onParamChange]
  )

  // Sync back to parent on changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(fromFlow(nodes, edges))
    }, 100)
    return () => clearTimeout(timeout)
  }, [nodes, edges])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: 'var(--accent)', strokeWidth: 2 } }, eds))
    },
    [setEdges]
  )

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault()
      setAddMenuPos({
        screenX: event.clientX,
        screenY: event.clientY
      })
    },
    []
  )

  const addNode = useCallback(
    (type: string) => {
      if (!addMenuPos || !reactFlowInstance.current) return
      const def = dspRegistry[type]
      if (!def) return

      // Convert screen coordinates to flow coordinates
      const flowPos = reactFlowInstance.current.screenToFlowPosition({
        x: addMenuPos.screenX,
        y: addMenuPos.screenY
      })

      const id = `dsp_${Date.now().toString(36)}`
      const defaultParams: Record<string, number | string> = {}
      for (const [key, pdef] of Object.entries(def.params)) {
        defaultParams[key] = pdef.default
      }

      const newNode: Node = {
        id,
        type: 'dspNode',
        position: flowPos,
        data: {
          nodeType: type,
          label: def.label,
          params: defaultParams,
          paramDefs: def.params
        }
      }
      setNodes((nds) => [...nds, newNode])
      setAddMenuPos(null)
    },
    [addMenuPos, dspRegistry, setNodes]
  )

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const ids = deleted.filter((n) => n.id !== 'input' && n.id !== 'output').map((n) => n.id)
      setEdges((eds) => eds.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)))
    },
    [setEdges]
  )

  // Group registry by category for context menu
  const categories = useMemo(() => {
    const cats: Record<string, { type: string; label: string }[]> = {}
    for (const [type, def] of Object.entries(dspRegistry)) {
      const cat = def.category || 'other'
      if (!cats[cat]) cats[cat] = []
      cats[cat].push({ type, label: def.label })
    }
    return cats
  }, [dspRegistry])

  return (
    <div className="node-graph-container" onClick={() => setAddMenuPos(null)}>
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onPaneContextMenu={onPaneContextMenu}
        onInit={(instance) => { reactFlowInstance.current = instance }}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>

      {addMenuPos && (
        <div
          className="context-menu"
          style={{ left: addMenuPos.screenX, top: addMenuPos.screenY }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-title">Add Node</div>
          {Object.entries(categories).map(([cat, items]) => (
            <div key={cat} className="context-menu-group">
              <div className="context-menu-cat">{cat}</div>
              {items.map((item) => (
                <button
                  key={item.type}
                  className="context-menu-item"
                  onClick={() => addNode(item.type)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="graph-hint">Right-click to add nodes. Drag between handles to connect.</div>
    </div>
  )
}

export default function NodeGraphEditor(props: Props): JSX.Element {
  return (
    <ReactFlowProvider>
      <GraphEditorInner {...props} />
    </ReactFlowProvider>
  )
}
