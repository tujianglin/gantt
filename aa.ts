import type { ColumnsDefine, TYPES, ListTableConstructorOptions } from '@visactor/vtable';
import type { Group } from '@visactor/vtable/es/vrender';
import type { Gantt } from '../Gantt';
export type LayoutObjectId = number | string;
import type { IGanttPlugin } from '../plugins/interface';
import type { IZoomScale } from './zoom-scale';
export interface ITimelineDateInfo {
    days: number;
    endDate: Date;
    startDate: Date;
    title: string;
    dateIndex: number;
    unit: 'year' | 'month' | 'quarter' | 'week' | 'day' | 'hour' | 'minute' | 'second';
    step: number;
}
export interface ITimelineHeaderStyle {
    padding?: number | number[];
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    strokeColor?: string;
    textAlign?: 'center' | 'end' | 'left' | 'right' | 'start';
    textOverflow?: string;
    textBaseline?: 'alphabetic' | 'bottom' | 'middle' | 'top';
    textStick?: boolean;
}
export interface IGrid {
    backgroundColor?: string;
    horizontalBackgroundColor?: string[] | ((args: GridHorizontalLineStyleArgumentType) => string);
    verticalBackgroundColor?: string[] | ((args: GridVerticalLineStyleArgumentType) => string);
    cellBackgroundColor?: string[] | ((args: GridCellStyleArgumentType) => string | {
        color: string;
        startTime: Date;
        endTime: Date;
    });
    weekendBackgroundColor?: string;
    verticalLine?: ILineStyle | ((args: GridVerticalLineStyleArgumentType) => ILineStyle);
    horizontalLine?: ILineStyle | ((args: GridHorizontalLineStyleArgumentType) => ILineStyle);
    verticalLineDependenceOnTimeScale?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'hour' | 'minute' | 'second';
}
export interface GanttConstructorOptions {
    records?: any[];
    taskListTable?: {
        tableWidth?: 'auto' | number;
        minTableWidth?: number;
        maxTableWidth?: number;
    } & Omit<ListTableConstructorOptions, 'container' | 'records' | 'defaultHeaderRowHeight' | 'defaultRowHeight' | 'overscrollBehavior' | 'rowSeriesNumber' | 'scrollStyle' | 'pixelRatio' | 'title'>;
    timelineHeader: {
        backgroundColor?: string;
        colWidth?: number;
        verticalLine?: ILineStyle;
        horizontalLine?: ILineStyle;
        zoomScale?: IZoomScale;
        scales: ITimelineScale[];
        includeHourUnits?: IGrid['verticalLineDependenceOnTimeScale'][];
    };
    taskBar?: {
        startDateField?: string;
        endDateField?: string;
        progressField?: string;
        labelText?: ITaskBarLabelText;
        labelTextStyle?: ITaskBarLabelTextStyle;
        barStyle?: ITaskBarStyle | ((args: TaskBarInteractionArgumentType) => ITaskBarStyle);
        milestoneStyle?: IMilestoneStyle;
        projectStyle?: ITaskBarStyle | ((args: TaskBarInteractionArgumentType) => ITaskBarStyle);
        customLayout?: ITaskBarCustomLayout;
        resizable?: boolean | [boolean, boolean] | ((interactionArgs: TaskBarInteractionArgumentType) => boolean | [boolean, boolean]);
        moveable?: boolean | ((interactionArgs: TaskBarInteractionArgumentType) => boolean);
        progressAdjustable?: boolean | ((interactionArgs: TaskBarInteractionArgumentType) => boolean);
        moveToExtendDateRange?: boolean;
        dragOrder?: boolean;
        hoverBarStyle?: ITaskBarHoverStyle;
        selectedBarStyle?: ITaskBarSelectedStyle;
        selectable?: boolean;
        clip?: boolean;
        menu?: {
            contextMenuItems?: TYPES.MenuListItem[] | ((record: string, index: number, dateIndex: number, startDate: Date, endDate: Date) => TYPES.MenuListItem[]);
        };
        scheduleCreatable?: boolean | ((interactionArgs: TaskBarInteractionArgumentType) => boolean);
        scheduleCreation?: {
            buttonStyle?: ILineStyle & {
                cornerRadius?: number;
                backgroundColor?: string;
            };
            customLayout?: ITaskCreationCustomLayout;
            maxWidth?: number;
            minWidth?: number;
        };
    };
    taskKeyField?: string;
    dependency?: {
        links: ITaskLink[];
        linkLineStyle?: ILineStyle;
        linkCreatable?: boolean;
        linkSelectable?: boolean;
        linkDeletable?: boolean;
        linkSelectedLineStyle?: ITaskLinkSelectedStyle;
        linkCreatePointStyle?: IPointStyle;
        linkCreatingPointStyle?: IPointStyle;
        linkCreatingLineStyle?: ILineStyle;
        distanceToTaskBar?: number;
    };
    grid?: IGrid;
    frame?: {
        outerFrameStyle: IFrameStyle;
        verticalSplitLine?: ILineStyle;
        horizontalSplitLine?: ILineStyle;
        verticalSplitLineMoveable?: boolean;
        verticalSplitLineHighlight?: ILineStyle;
    };
    markLine?: boolean | IMarkLine | IMarkLine[];
    minDate?: string;
    maxDate?: string;
    headerRowHeight?: number;
    rowHeight?: number;
    rowSeriesNumber?: IRowSeriesNumber;
    overscrollBehavior?: 'auto' | 'none';
    scrollStyle?: IScrollStyle;
    pixelRatio?: number;
    dateFormat?: 'yyyy-mm-dd' | 'dd-mm-yyyy' | 'mm/dd/yyyy' | 'yyyy/mm/dd' | 'dd/mm/yyyy' | 'yyyy.mm.dd' | 'dd.mm.yyyy' | 'mm.dd.yyyy';
    underlayBackgroundColor?: string;
    groupBy?: true | string | string[];
    tasksShowMode?: TasksShowMode;
    projectSubTasksExpandable?: boolean;
    eventOptions?: IEventOptions;
    keyboardOptions?: IKeyboardOptions;
    markLineCreateOptions?: IMarkLineCreateOptions;
    plugins?: IGanttPlugin[];
}
export type ITaskBarLabelText = string;
export interface ITimelineScale {
    rowHeight?: number;
    unit: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'hour' | 'minute' | 'second';
    step: number;
    startOfWeek?: 'sunday' | 'monday';
    customLayout?: IDateCustomLayout;
    style?: ITimelineHeaderStyle;
    format?: (date: DateFormatArgumentType) => string;
    visible?: boolean;
}
export interface ITaskBarLabelTextStyle {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    outsideColor?: string;
    textAlign?: 'center' | 'end' | 'left' | 'right' | 'start';
    textOverflow?: string;
    textBaseline?: 'alphabetic' | 'bottom' | 'middle' | 'top';
    padding?: number | number[];
    orient?: 'left' | 'top' | 'right' | 'bottom';
    orientHandleWithOverflow?: 'left' | 'top' | 'right' | 'bottom';
}
export interface ITaskBarStyle {
    barColor?: string;
    completedBarColor?: string;
    width?: number;
    cornerRadius?: number;
    borderWidth?: number;
    borderLineWidth?: number;
    borderColor?: string;
    minSize?: number;
}
export interface IMilestoneStyle {
    borderColor?: string;
    borderLineWidth?: number;
    fillColor?: string;
    cornerRadius?: number;
    width?: number;
    labelText?: ITaskBarLabelText;
    labelTextStyle?: ITaskBarLabelTextStyle;
    textOrient?: 'left' | 'top' | 'right' | 'bottom';
}
export type ILineStyle = {
    lineColor?: string;
    lineWidth?: number;
    lineDash?: number[];
};
export type IPointStyle = {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
    radius?: number;
};
export interface IMarkLine {
    date: string;
    content?: string;
    contentStyle?: {
        color?: string;
        fontSize?: number;
        fontWeight?: string;
        lineHeight?: number;
        backgroundColor?: string;
        cornerRadius?: number | number[];
    };
    style?: ILineStyle;
    position?: 'left' | 'right' | 'middle' | 'date';
    scrollToMarkLine?: boolean;
}
export type ITableColumnsDefine = ColumnsDefine;
export type IFrameStyle = {
    borderColor?: string;
    borderLineWidth?: number | number[];
    borderLineDash?: number[];
    cornerRadius?: number;
};
export type ITableStyle = TYPES.ThemeStyle;
export type IRowSeriesNumber = TYPES.IRowSeriesNumber;
export type IScrollStyle = TYPES.ScrollStyle;
export type IEventOptions = TYPES.TableEventOptions;
export interface IKeyboardOptions {
    deleteLinkOnDel?: boolean;
    deleteLinkOnBack?: boolean;
}
export type DateFormatArgumentType = {
    dateIndex: number;
    startDate: Date;
    endDate: Date;
};
export type TaskBarInteractionArgumentType = {
    taskRecord: any;
    index: number;
    subIndex?: number;
    startDate: Date;
    endDate: Date;
    ganttInstance: Gantt;
};
export type TaskBarCustomLayoutArgumentType = {
    width: number;
    height: number;
    index: number;
    startDate: Date;
    endDate: Date;
    taskDays: number;
    progress: number;
    taskRecord: any;
    ganttInstance: Gantt;
};
export type ITaskBarCustomLayoutObj = {
    rootContainer?: Group;
    renderDefaultBar?: boolean;
    renderDefaultResizeIcon?: boolean;
    renderDefaultText?: boolean;
};
export type ITaskBarCustomLayout = (args: TaskBarCustomLayoutArgumentType) => ITaskBarCustomLayoutObj;
export type DateCustomLayoutArgumentType = {
    width: number;
    height: number;
    index: number;
    dateIndex: number;
    title: string;
    startDate: Date;
    endDate: Date;
    days: number;
    ganttInstance: Gantt;
};
export type IDateCustomLayoutObj = {
    rootContainer: Group;
    renderDefaultText?: boolean;
};
export type IDateCustomLayout = (args: DateCustomLayoutArgumentType) => IDateCustomLayoutObj;
export type GridVerticalLineStyleArgumentType = {
    index: number;
    dateIndex: number;
    date?: Date;
    ganttInstance: Gantt;
};
export type GridHorizontalLineStyleArgumentType = {
    index: number;
    ganttInstance: Gantt;
};
export type GridCellStyleArgumentType = {
    rowIndex: number;
    colIndex: number;
    date?: Date;
    ganttInstance: Gantt;
};
export type TaskCreationCustomLayoutArgumentType = {
    width: number;
    height: number;
    ganttInstance: Gantt;
};
export type ITaskCreationCustomLayoutObj = {
    rootContainer: Group;
};
export type ITaskCreationCustomLayout = (args: TaskCreationCustomLayoutArgumentType) => ITaskCreationCustomLayoutObj;
export type ITaskLink = {
    type: DependencyType;
    linkedFromTaskKey?: string | number | (string | number)[];
    linkedToTaskKey?: string | number | (string | number)[];
    linkLineStyle?: ILineStyle;
};
export type ITaskLinkSelectedStyle = ILineStyle & {
    shadowBlur?: number;
    shadowOffset?: number;
    shadowColor?: string;
};
export declare enum DependencyType {
    FinishToStart = "finish_to_start",
    StartToStart = "start_to_start",
    FinishToFinish = "finish_to_finish",
    StartToFinish = "start_to_finish"
}
export declare enum TasksShowMode {
    Tasks_Separate = "tasks_separate",
    Sub_Tasks_Inline = "sub_tasks_inline",
    Sub_Tasks_Separate = "sub_tasks_separate",
    Sub_Tasks_Arrange = "sub_tasks_arrange",
    Sub_Tasks_Compact = "sub_tasks_compact",
    Project_Sub_Tasks_Inline = "project_sub_tasks_inline"
}
export declare enum TaskType {
    TASK = "task",
    PROJECT = "project",
    MILESTONE = "milestone"
}
export type ITaskBarSelectedStyle = {
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowColor?: string;
    borderColor?: string;
    borderLineWidth?: number;
};
export type ITaskBarHoverStyle = {
    cornerRadius?: number;
    barOverlayColor?: string;
};
export type IMarkLineCreateOptions = {
    markLineCreatable: boolean;
    markLineCreationHoverToolTip?: {
        position?: 'top' | 'bottom';
        tipContent?: string;
        style?: {
            contentStyle?: any;
            panelStyle?: any;
        };
    };
    markLineCreationStyle?: {
        fill?: string;
        size?: number;
        iconSize?: number;
        svg?: string;
    };
};
